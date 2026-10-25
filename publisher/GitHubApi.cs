using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace CyanotePublisher;

/// <summary>GitHub REST API（Contents）最小封装。</summary>
public sealed class GitHubClient : IDisposable
{
    private readonly HttpClient _http;

    public string Repo { get; }      // "owner/name"
    public string Branch { get; }    // "main"
    public string BasePath { get; }  // "" 或 "docs"（站点在仓库中的子目录）

    public GitHubClient(string repo, string branch, string basePath, string token, string apiBase = "https://api.github.com/")
    {
        Repo = repo.Trim().Trim('/');
        Branch = string.IsNullOrWhiteSpace(branch) ? "main" : branch.Trim();
        BasePath = string.IsNullOrWhiteSpace(basePath) ? "" : basePath.Trim().Trim('/');
        _http = new HttpClient { BaseAddress = new Uri(apiBase.Trim().TrimEnd('/') + "/", UriKind.Absolute) };
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Trim());
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        _http.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("CyanotePublisher/1.0");
    }

    public string SiteBase => BasePath.Length == 0 ? "" : BasePath + "/";

    private string RepoUrl => $"repos/{Repo}";

    /// <summary>返回仓库信息（name/private），失败抛出带中文说明的异常。</summary>
    public async Task<RepoInfo> CheckRepoAsync()
    {
        using var res = await _http.GetAsync(RepoUrl);
        await EnsureOk(res, "检查仓库");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return new RepoInfo(
            Name: json.GetProperty("name").GetString() ?? "",
            Private: json.GetProperty("private").GetBoolean(),
            HtmlUrl: json.GetProperty("html_url").GetString() ?? "",
            DefaultBranch: json.GetProperty("default_branch").GetString() ?? "");
    }

    /// <summary>读取文本文件；404 返回 null。</summary>
    public async Task<(string Text, string Sha)?> GetTextFileAsync(string path)
    {
        var url = $"{RepoUrl}/contents/{Uri.EscapeDataString(path).Replace("%2F", "/")}?ref={Uri.EscapeDataString(Branch)}";
        using var res = await _http.GetAsync(url);
        if (res.StatusCode == HttpStatusCode.NotFound) return null;
        await EnsureOk(res, $"读取 {path}");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var sha = json.GetProperty("sha").GetString()!;
        var encoding = json.TryGetProperty("encoding", out var enc) ? enc.GetString() : null;
        if (encoding == "base64")
        {
            var b64 = json.GetProperty("content").GetString() ?? "";
            var bytes = Convert.FromBase64String(b64.Replace("\n", "").Replace("\r", ""));
            return (Encoding.UTF8.GetString(bytes), sha);
        }
        // 超过 1MB 的文件 API 不返回 content —— 站点索引不至于如此之大，但给出可读错误
        throw new GitHubApiException($"{path} 过大（>1MB），GitHub Contents API 无法读取，请在本地运行 node build.mjs 后提交。");
    }

    /// <summary>提交一个文本文件（新建或覆盖）。</summary>
    public async Task<string> PutTextFileAsync(string path, string text, string message, string? sha = null)
    {
        var payload = JsonSerializer.Serialize(new
        {
            message,
            content = Convert.ToBase64String(Encoding.UTF8.GetBytes(text)),
            branch = Branch,
            sha,
        });
        var url = $"{RepoUrl}/contents/{Uri.EscapeDataString(path).Replace("%2F", "/")}";
        using var res = await _http.PutAsync(url, new StringContent(payload, Encoding.UTF8, "application/json"));
        await EnsureOk(res, $"提交 {path}");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("commit").GetProperty("html_url").GetString() ?? "";
    }

    private static async Task EnsureOk(HttpResponseMessage res, string what)
    {
        if (res.IsSuccessStatusCode) return;
        var message = "";
        try
        {
            var doc = await res.Content.ReadFromJsonAsync<JsonElement>();
            if (doc.ValueKind == JsonValueKind.Object && doc.TryGetProperty("message", out var m))
                message = m.GetString() ?? "";
        }
        catch { /* 保留原始状态码 */ }
        throw res.StatusCode switch
        {
            HttpStatusCode.Unauthorized => new GitHubApiException($"{what}失败：令牌无效或已过期（401）。请检查 Personal Access Token。"),
            HttpStatusCode.Forbidden => new GitHubApiException($"{what}失败：无权限（403）。令牌需要对该仓库的 Contents 读写权限；若是 fine-grained token 请确认勾选了仓库。{message}"),
            HttpStatusCode.NotFound => new GitHubApiException($"{what}失败：仓库、分支或路径不存在（404）。{message}"),
            HttpStatusCode.Conflict => new GitHubApiException($"{what}失败：文件在读取后被他人修改（409），请重试。{message}"),
            HttpStatusCode.UnprocessableEntity => new GitHubApiException($"{what}失败（422）：{message}"),
            (HttpStatusCode)429 => new GitHubApiException($"{what}失败：API 速率受限（429），稍后重试。"),
            _ => new GitHubApiException($"{what}失败（{(int)res.StatusCode}）：{message}"),
        };
    }

    public void Dispose() => _http.Dispose();
}

public sealed record RepoInfo(string Name, bool Private, string HtmlUrl, string DefaultBranch);

public sealed class GitHubApiException(string message) : Exception(message);

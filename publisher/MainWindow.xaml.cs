using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;

namespace CyanotePublisher;

public partial class MainWindow : Window
{
    private readonly AppConfig _config;
    private FrontMatter _fm = new();
    private string _body = "";
    private string? _loadedPath;
    private bool _busy;

    public MainWindow()
    {
        InitializeComponent();
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        _config = AppConfig.Load();
        RepoBox.Text = _config.Repo;
        BranchBox.Text = _config.Branch;
        BasePathBox.Text = _config.BasePath;
        TokenBox.Password = _config.Token;
        ApiBaseBox.Text = _config.ApiBase;
        Log($"🌊 Cyanote Publisher 就绪。选择或拖入一个 Markdown 文件开始发布。");
    }

    // ---------- 配置 ----------

    private void SaveConfig()
    {
        _config.Repo = RepoBox.Text.Trim();
        _config.Branch = BranchBox.Text.Trim();
        _config.BasePath = BasePathBox.Text.Trim();
        _config.Token = TokenBox.Password.Trim();
        _config.ApiBase = string.IsNullOrWhiteSpace(ApiBaseBox.Text) ? "https://api.github.com" : ApiBaseBox.Text.Trim();
        _config.Save();
    }

    private void OnFieldChanged(object sender, RoutedEventArgs e)
    {
        if (TestStatus is not null && !_busy) TestStatus.Text = "配置已修改，建议重新测试连接";
    }

    protected override void OnClosed(EventArgs e)
    {
        SaveConfig();
        base.OnClosed(e);
    }

    // ---------- 文件载入 ----------

    private void OnPickFile(object sender, RoutedEventArgs e)
    {
        var dlg = new OpenFileDialog
        {
            Title = "选择要发布的 Markdown 文章",
            Filter = "Markdown 文件 (*.md;*.markdown;*.txt)|*.md;*.markdown;*.txt|所有文件 (*.*)|*.*",
        };
        if (dlg.ShowDialog(this) != true) return;
        LoadFile(dlg.FileName);
    }

    protected override void OnDragOver(DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    protected override void OnDrop(DragEventArgs e)
    {
        if (e.Data.GetData(DataFormats.FileDrop) is string[] files && files.Length > 0)
            LoadFile(files[0]);
    }

    /// <summary>读取文件（UTF-8 优先，回退 GB18030），解析 front-matter 并填充界面。</summary>
    private void LoadFile(string path)
    {
        try
        {
            var bytes = File.ReadAllBytes(path);
            string text;
            if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
                text = Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);
            else
            {
                try { text = new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(bytes); }
                catch (DecoderFallbackException)
                {
                    text = Encoding.GetEncoding("GB18030").GetString(bytes);
                    Log($"⚠ 文件不是 UTF-8，已按 GB18030 解码（建议另存为 UTF-8）");
                }
            }

            _fm = FrontMatter.Parse(text);
            _body = _fm.Body;
            _loadedPath = path;

            var fileNameNoExt = Path.GetFileNameWithoutExtension(path);
            var h1 = Regex.Match(_body, @"^#\s+(.+)$", RegexOptions.Multiline);
            var titleFromHeading = h1.Success ? h1.Groups[1].Value.Trim().Trim('#', '*', '`', '_') : "";

            TitleBox.Text = !string.IsNullOrWhiteSpace(_fm.Title) ? _fm.Title
                          : titleFromHeading.Length > 0 ? titleFromHeading
                          : fileNameNoExt;
            SlugBox.Text = FrontMatter.Slugify(fileNameNoExt);
            var date = FrontMatter.ToDateTime(_fm.Data.TryGetValue("date", out var d) ? d?.ToString() : null)
                       ?? DateTime.UtcNow;
            DateBox.Text = date.ToString("yyyy-MM-dd HH:mm");
            CategoriesBox.Text = string.Join(", ", _fm.Categories);
            TagsBox.Text = string.Join(", ", _fm.Tags);
            ExcerptBox.Text = !string.IsNullOrWhiteSpace(_fm.Excerpt) ? _fm.Excerpt : FrontMatter.Snippet(_body, 150);
            PinnedCheck.IsChecked = _fm.Pinned;
            DraftCheck.IsChecked = _fm.IsDraft;
            BodyPreview.Text = _body.Trim() is { Length: > 0 } b ? b : "（文件没有正文）";

            FileLabel.Text = Path.GetFileName(path);
            PublishStatus.Text = "";
            Log($"✓ 已载入 {Path.GetFileName(path)}（{(_fm.HasFm ? "含 front-matter" : "无 front-matter，将自动补全")}，正文 {_body.Trim().Length} 字符）");
        }
        catch (Exception ex)
        {
            Log($"✗ 读取文件失败：{ex.Message}");
            MessageBox.Show(this, ex.Message, "读取失败", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    // ---------- GitHub ----------

    private GitHubClient MakeClient()
    {
        var repo = RepoBox.Text.Trim();
        if (!Regex.IsMatch(repo, @"^[\w.-]+/[\w.-]+$"))
            throw new GitHubApiException("仓库格式应为 owner/repo，例如 Lyrissonare/blog");
        if (TokenBox.Password.Trim().Length == 0)
            throw new GitHubApiException("请先填写 Personal Access Token（需要该仓库 Contents 读写权限）");
        var apiBase = string.IsNullOrWhiteSpace(ApiBaseBox.Text) ? "https://api.github.com" : ApiBaseBox.Text.Trim();
        return new GitHubClient(repo, BranchBox.Text, BasePathBox.Text, TokenBox.Password, apiBase);
    }

    private async void OnTestConnection(object sender, RoutedEventArgs e)
    {
        if (_busy) return;
        _busy = true;
        SetBusy(false);
        SaveConfig();
        try
        {
            using var client = MakeClient();
            var repo = await client.CheckRepoAsync();
            var index = await client.GetTextFileAsync($"{client.SiteBase}content/index.json");
            var count = index is null ? 0 : Manifest.Parse(index.Value.Text).Posts.Count;
            TestStatus.Text = $"✓ {repo.Name}{(repo.Private ? "（私有）" : "")} · 分支 {client.Branch} · 已发布 {count} 篇";
            Log($"✓ 连接成功：{repo.HtmlUrl}（默认分支 {repo.DefaultBranch}，目标分支 {client.Branch}，索引 {count} 篇）");
            if (index is null)
                Log($"⚠ 仓库中还没有 {client.SiteBase}content/index.json —— 请先把 Cyanote_Lite 站点文件推送到该仓库。");
            var settings = await client.GetTextFileAsync($"{client.SiteBase}content/settings.json");
            if (settings is null)
                Log($"⚠ 仓库中缺少 {client.SiteBase}content/settings.json，关于页/侧栏小部件将无法加载。");
        }
        catch (Exception ex)
        {
            TestStatus.Text = "✗ 连接失败";
            Log($"✗ 连接失败：{ex.Message}");
        }
        finally
        {
            _busy = false;
            SetBusy(true);
        }
    }

    private async void OnPublish(object sender, RoutedEventArgs e)
    {
        if (_busy) return;
        if (_loadedPath is null)
        {
            Log("✗ 请先选择一个 Markdown 文件");
            return;
        }
        _busy = true;
        SetBusy(false);
        SaveConfig();
        PublishStatus.Text = "推送中…";

        try
        {
            // WPF 控件是线程亲和的：所有 UI 输入必须先在 UI 线程收集成普通对象
            using var client = MakeClient();
            var input = new PublishInput(
                Slug: FrontMatter.Slugify(SlugBox.Text),
                Title: TitleBox.Text.Trim(),
                DateIso: FrontMatter.ToIso(DateBox.Text),
                DateText: DateBox.Text,
                IsDraft: DraftCheck.IsChecked == true,
                Categories: SplitList(CategoriesBox.Text),
                Tags: SplitList(TagsBox.Text),
                Excerpt: ExcerptBox.Text.Trim(),
                Pinned: PinnedCheck.IsChecked == true,
                Fm: _fm,
                Body: _body);
            if (input.Slug.Length == 0) throw new GitHubApiException("slug 不能为空（由文件名或输入生成）");
            if (input.Title.Length == 0) throw new GitHubApiException("标题不能为空");
            if (input.DateIso is null) throw new GitHubApiException($"日期无法解析：「{input.DateText}」，格式如 2025-01-06 09:00");

            var result = await Task.Run(() => PublishAsync(client, input));
            PublishStatus.Text = "✓ 发布完成";
            Log($"🎉 完成！文章页（部署完成后可用）：{result.ArticleUrl}");
        }
        catch (Exception ex)
        {
            PublishStatus.Text = "✗ 失败";
            Log($"✗ 发布失败：{ex.Message}");
        }
        finally
        {
            _busy = false;
            SetBusy(true);
        }
    }

    private sealed record PublishResult(string ArticleUrl);

    private sealed record PublishInput(
        string Slug, string Title, string? DateIso, string DateText, bool IsDraft,
        List<string> Categories, List<string> Tags, string Excerpt, bool Pinned,
        FrontMatter Fm, string Body);

    /// <summary>推送 md + 更新索引。字段计算与 build.mjs 完全一致，保证 CI 重建不产生 diff。</summary>
    private async Task<PublishResult> PublishAsync(GitHubClient client, PublishInput input)
    {
        var slug = input.Slug;
        // 截断到分钟：md 的 front-matter 只存到分钟（yyyy-MM-dd HH:mm），
        // 秒级时间戳会让 CI 的 build.mjs 重建结果与本次写入不一致
        var n = DateTime.UtcNow;
        var nowIso = new DateTime(n.Year, n.Month, n.Day, n.Hour, n.Minute, 0, DateTimeKind.Utc)
            .ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");

        // 1) 组装 md（保留未知 front-matter 键）
        var fm = input.Fm;
        fm.Set("title", input.Title);
        fm.Set("date", input.DateIso!);
        fm.Set("updated", nowIso); // 推送即更新：与 CI 重建结果保持一致
        fm.Set("categories", input.Categories.Cast<object?>().ToList());
        fm.Set("tags", input.Tags.Cast<object?>().ToList());
        if (input.Excerpt.Length > 0) fm.Set("excerpt", input.Excerpt); else fm.Data.Remove("excerpt");
        fm.Set("pinned", input.Pinned);
        if (input.IsDraft) fm.Set("status", "draft"); else fm.Data.Remove("status");
        fm.Data.Remove("draft");
        var mdText = fm.Serialize(input.Body);

        // 2) 组装索引条目（与 build.mjs loadPost 相同的规则）
        var content = input.Body.TrimStart();
        var publishedAt = input.IsDraft ? null : input.DateIso;
        var entry = new ManifestPost
        {
            Slug = slug,
            Title = input.Title,
            Content = content,
            Excerpt = input.Excerpt.Length > 0 ? input.Excerpt : FrontMatter.Snippet(content, 150),
            Cover = fm.Cover ?? "",
            Categories = input.Categories,
            Tags = input.Tags,
            Status = input.IsDraft ? "draft" : "published",
            Pinned = input.Pinned,
            Views = fm.Views,
            CreatedAt = publishedAt ?? nowIso,
            UpdatedAt = nowIso,
            PublishedAt = publishedAt,
        };

        var postsPath = $"{client.SiteBase}content/posts/{slug}.md";
        var indexPath = $"{client.SiteBase}content/index.json";

        Log($"→ 连接仓库 {client.Repo}（分支 {client.Branch}）…");
        await client.CheckRepoAsync();

        // 3) 提交文章 md
        var existing = await client.GetTextFileAsync(postsPath);
        var mdCommit = await client.PutTextFileAsync(
            postsPath, mdText,
            $"cyanote: {(existing is null ? "发布" : "更新")}文章 {slug}" + (input.IsDraft ? "（草稿）" : ""),
            existing?.Sha);
        Log($"✓ 文章已提交：{(existing is null ? "新建" : "覆盖")} {postsPath}\n   {mdCommit}");

        // 4) 合并并提交索引
        var indexFile = await client.GetTextFileAsync(indexPath);
        var manifest = indexFile is not null ? Manifest.Parse(indexFile.Value.Text) : new Manifest();
        if (indexFile is null)
        {
            Log($"⚠ {indexPath} 不存在，将创建空索引（请确认已推送 Cyanote_Lite 站点文件）");
            var settings = await client.GetTextFileAsync($"{client.SiteBase}content/settings.json");
            if (settings is null)
                Log($"⚠ {client.SiteBase}content/settings.json 也缺失，关于页与侧栏小部件将不可用。");
        }
        if (input.IsDraft)
        {
            var removed = manifest.Posts.RemoveAll(p => p.Slug == slug);
            Log(removed > 0 ? $"✓ 草稿：已从公开索引移除 {slug}（md 文件仍保留在仓库中）" : $"✓ 草稿：{slug} 未进入公开索引");
        }
        else
        {
            manifest.Upsert(entry);
            Log($"✓ 索引已更新：共 {manifest.Posts.Count} 篇（{slug} 为第 {manifest.Posts.FindIndex(p => p.Slug == slug) + 1} 篇）");
        }
        var indexCommit = await client.PutTextFileAsync(
            indexPath, manifest.Serialize(), "cyanote: 更新文章索引", indexFile?.Sha);
        Log($"✓ 索引已提交：{indexPath}\n   {indexCommit}");

        // 5) 站点地址
        var parts = client.Repo.Split('/');
        var site = parts[1].EndsWith(".github.io", StringComparison.OrdinalIgnoreCase)
            ? $"https://{parts[0]}.github.io/"
            : $"https://{parts[0]}.github.io/{parts[1]}/";
        if (client.BasePath.Length > 0) site += client.BasePath + "/";
        Log("⏳ GitHub Pages 将在 1–2 分钟内自动重新部署。");
        return new PublishResult($"{site}#/post/{slug}");
    }

    private static List<string> SplitList(string text) =>
        text.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    // ---------- 杂项 ----------

    private void SetBusy(bool enabled)
    {
        PickButton.IsEnabled = enabled;
        PublishButton.IsEnabled = enabled;
        TestButton.IsEnabled = enabled;
    }

    private void Log(string message)
    {
        Dispatcher.Invoke(() =>
        {
            LogBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}\n");
            LogBox.ScrollToEnd();
        });
    }
}

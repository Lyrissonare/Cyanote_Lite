using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace CyanotePublisher;

/// <summary>content/index.json 的数据模型与合并逻辑，字段与排序和 build.mjs 完全一致。</summary>
public sealed partial class Manifest
{
    [JsonPropertyName("posts")]
    public List<ManifestPost> Posts { get; set; } = new();

    public static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        // 中文等非 ASCII 字符不转义，与 build.mjs 的 JSON.stringify 输出一致
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };

    public static Manifest Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Manifest();
        return JsonSerializer.Deserialize<Manifest>(json, JsonOpts) ?? new Manifest();
    }

    public string Serialize() => UnescapeSurrogatePairs(JsonSerializer.Serialize(this, JsonOpts)) + "\n";

    /// <summary>System.Text.Json 会把 BMP 外字符（emoji 等）转义成 \uD8xx\uDCxx，
    /// 而 JS 的 JSON.stringify 原样输出 —— 解码回来，保证与 build.mjs 字节一致。</summary>
    [GeneratedRegex(@"\\u(d[89ab][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})", RegexOptions.IgnoreCase)]
    private static partial Regex SurrogateEscapeRegex();

    private static string UnescapeSurrogatePairs(string json) =>
        SurrogateEscapeRegex().Replace(json, m =>
        {
            var high = (char)int.Parse(m.Groups[1].Value, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var low = (char)int.Parse(m.Groups[2].Value, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            return char.ConvertFromUtf32(char.ConvertToUtf32(high, low));
        });

    /// <summary>合并一篇文章：同 slug 替换，最后按 (createdAt, slug) 升序重排 —— 与 build.mjs 相同的规范顺序。</summary>
    public void Upsert(ManifestPost entry)
    {
        Posts.RemoveAll(p => string.Equals(p.Slug, entry.Slug, StringComparison.Ordinal));
        Posts.Add(entry);
        Posts.Sort((a, b) =>
        {
            var c = string.CompareOrdinal(a.CreatedAt ?? "", b.CreatedAt ?? "");
            return c != 0 ? c : string.CompareOrdinal(a.Slug ?? "", b.Slug ?? "");
        });
    }
}

public sealed class ManifestPost
{
    [JsonPropertyName("slug")] public string Slug { get; set; } = "";
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("content")] public string Content { get; set; } = "";
    [JsonPropertyName("excerpt")] public string Excerpt { get; set; } = "";
    [JsonPropertyName("cover")] public string Cover { get; set; } = "";
    [JsonPropertyName("categories")] public List<string> Categories { get; set; } = new();
    [JsonPropertyName("tags")] public List<string> Tags { get; set; } = new();
    [JsonPropertyName("status")] public string Status { get; set; } = "published";
    [JsonPropertyName("pinned")] public bool Pinned { get; set; }
    [JsonPropertyName("views")] public long Views { get; set; }
    // 日期保持原始 ISO 字符串（含 .fffZ），避免序列化往返后与 build.mjs 输出不一致
    [JsonPropertyName("createdAt")] public string? CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public string? UpdatedAt { get; set; }
    [JsonPropertyName("publishedAt")] public string? PublishedAt { get; set; }
}

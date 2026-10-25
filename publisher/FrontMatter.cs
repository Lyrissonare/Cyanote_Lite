using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace CyanotePublisher;

/// <summary>
/// Front-matter 解析 / 序列化 / 文章条目生成。
/// 与 Cyanote_Lite 的 tools/frontmatter.mjs + build.mjs 保持同一语义：
/// 两者生成的 content/index.json 必须字节一致（CI 重建索引时不产生无谓 diff）。
/// 无时区的日期一律按 UTC 解释。
/// </summary>
public sealed partial class FrontMatter
{
    /// <summary>已知的键（小写）。序列化时这些键按规范顺序输出，其余原样附在后面。</summary>
    private static readonly string[] KnownKeys =
    {
        "title", "date", "updated", "categories", "tags", "excerpt",
        "cover", "pinned", "views", "status", "draft",
    };

    /// <summary>键（小写）→ 值（string / bool / long / List&lt;object?&gt;）。</summary>
    public Dictionary<string, object?> Data { get; } = new(StringComparer.OrdinalIgnoreCase);

    public string Body { get; set; } = "";

    public bool HasFm { get; private set; }

    public string? Title => Data.TryGetValue("title", out var v) ? v as string : null;
    public string? Excerpt => Data.TryGetValue("excerpt", out var v) ? v as string : null;
    public string? Cover => Data.TryGetValue("cover", out var v) ? v as string : null;
    public bool Pinned => Data.TryGetValue("pinned", out var v) && v is true or "true" or 1L;
    public long Views => Data.TryGetValue("views", out var v) && v is long n ? n : 0;

    public bool IsDraft =>
        (Data.TryGetValue("status", out var s) && s as string == "draft") ||
        (Data.TryGetValue("draft", out var d) && d is true or "true");

    public List<string> Categories => GetStringList("categories");
    public List<string> Tags => GetStringList("tags");

    public List<string> GetStringList(string key)
    {
        if (!Data.TryGetValue(key, out var v) || v is not List<object?> list) return new();
        return list.Where(x => !string.IsNullOrWhiteSpace(x?.ToString())).Select(x => x!.ToString()!.Trim()).ToList();
    }

    public void Set(string key, object? value) => Data[key.ToLowerInvariant()] = value;

    // ---------- 解析 ----------

    [GeneratedRegex(@"^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)")]
    private static partial Regex FmRegex();

    [GeneratedRegex(@"^[ \t]+-[ \t]?(.*)$")]
    private static partial Regex DashItemRegex();

    [GeneratedRegex(@"^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$")]
    private static partial Regex KeyValueRegex();

    [GeneratedRegex(@"^-?\d+$")]
    private static partial Regex IntegerRegex();

    public static FrontMatter Parse(string raw)
    {
        var text = raw.TrimStart('\uFEFF');
        var fm = new FrontMatter();
        var m = FmRegex().Match(text);
        if (!m.Success)
        {
            fm.Body = text;
            return fm;
        }
        fm.HasFm = true;
        fm.Body = text[m.Length..];

        string? lastKey = null;
        foreach (var line in m.Groups[1].Value.Split('\n'))
        {
            var trimmedEnd = line.TrimEnd('\r');
            if (string.IsNullOrWhiteSpace(trimmedEnd)) continue;

            var dash = DashItemRegex().Match(trimmedEnd);
            if (dash.Success && lastKey is not null)
            {
                if (fm.Data[lastKey] is not List<object?> list)
                {
                    list = new List<object?>();
                    fm.Data[lastKey] = list;
                }
                list.Add(ParseScalar(dash.Groups[1].Value));
                continue;
            }
            var kv = KeyValueRegex().Match(trimmedEnd);
            if (!kv.Success) continue; // 容忍无法解析的行
            var key = kv.Groups[1].Value.ToLowerInvariant();
            var valueRaw = kv.Groups[2].Value;
            if (string.IsNullOrWhiteSpace(valueRaw))
            {
                fm.Data[key] = new List<object?>(); // 可能会被后面的 dash 列表填充
            }
            else
            {
                var t = valueRaw.Trim();
                fm.Data[key] = t.StartsWith('[') && t.EndsWith(']')
                    ? ParseInlineArray(t)
                    : ParseScalar(valueRaw);
            }
            lastKey = key;
        }
        return fm;
    }

    private static object? ParseScalar(string raw)
    {
        var v = raw.Trim();
        if (v.Length == 0) return "";
        if (v.StartsWith('"') && v.EndsWith('"') && v.Length >= 2)
        {
            try { return JsonSerializer.Deserialize<string>(v); }
            catch { return v[1..^1]; }
        }
        if (v.StartsWith('\'') && v.EndsWith('\'') && v.Length >= 2)
            return v[1..^1].Replace("''", "'");
        if (v == "true") return true;
        if (v == "false") return false;
        if (v == "null") return null;
        if (IntegerRegex().IsMatch(v)) return long.Parse(v, CultureInfo.InvariantCulture);
        return v;
    }

    private static List<object?> ParseInlineArray(string raw)
    {
        var inner = raw.Trim()[1..^1];
        if (string.IsNullOrWhiteSpace(inner)) return new();
        return SplitTop(inner).Select(ParseScalar).ToList();
    }

    /// <summary>按不在引号/括号内的逗号切分（与 JS 版一致）。</summary>
    private static List<string> SplitTop(string s)
    {
        var parts = new List<string>();
        var cur = new StringBuilder();
        var depth = 0;
        char? quote = null;
        for (var i = 0; i < s.Length; i++)
        {
            var ch = s[i];
            if (quote is not null)
            {
                cur.Append(ch);
                if (ch == quote) quote = null;
            }
            else if (ch is '"' or '\'')
            {
                quote = ch;
                cur.Append(ch);
            }
            else if (ch is '[' or '(')
            {
                depth++;
                cur.Append(ch);
            }
            else if (ch is ']' or ')')
            {
                depth--;
                cur.Append(ch);
            }
            else if (ch == ',' && depth == 0)
            {
                parts.Add(cur.ToString());
                cur.Clear();
            }
            else
            {
                cur.Append(ch);
            }
        }
        if (cur.ToString().Trim().Length > 0) parts.Add(cur.ToString());
        return parts;
    }

    // ---------- 序列化 ----------

    public string Serialize(string? body = null)
    {
        var lines = new List<string> { "---" };

        void Push(string k, string v) => lines.Add($"{k}: {v}");

        string FmtDate(string iso)
        {
            var dt = ToDateTime(iso);
            return dt?.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? iso;
        }

        if (Data.TryGetValue("title", out var title) && title is not null)
            Push("title", QuoteIfNeeded(title.ToString()!));
        if (Data.TryGetValue("date", out var date) && !string.IsNullOrEmpty(date?.ToString()))
            Push("date", FmtDate(date.ToString()!));
        if (Data.TryGetValue("updated", out var updated) && !string.IsNullOrEmpty(updated?.ToString()))
            Push("updated", FmtDate(updated.ToString()!));
        foreach (var (key, label) in new[] { ("categories", "categories"), ("tags", "tags") })
        {
            if (Data.TryGetValue(key, out var v) && v is List<object?> { Count: > 0 } list)
                Push(label, $"[{string.Join(", ", list.Select(x => QuoteIfNeeded(x?.ToString() ?? "")))}]");
        }
        if (Data.TryGetValue("excerpt", out var excerpt) && !string.IsNullOrEmpty(excerpt?.ToString()))
            Push("excerpt", QuoteIfNeeded(excerpt.ToString()!));
        if (Data.TryGetValue("cover", out var cover) && !string.IsNullOrEmpty(cover?.ToString()))
            Push("cover", QuoteIfNeeded(cover.ToString()!));
        if (Pinned) Push("pinned", "true");
        if (Views > 0) Push("views", Views.ToString(CultureInfo.InvariantCulture));
        if (IsDraft) Push("status", "draft");

        foreach (var (k, v) in Data)
        {
            if (KnownKeys.Contains(k, StringComparer.OrdinalIgnoreCase)) continue;
            if (v is List<object?> list) Push(k, $"[{string.Join(", ", list.Select(x => QuoteIfNeeded(x?.ToString() ?? "")))}]");
            else if (v is not null) Push(k, QuoteIfNeeded(v.ToString()!));
        }

        lines.Add("---");
        var b = (body ?? Body) ?? "";
        return string.Join('\n', lines) + "\n\n" + b.TrimStart();
    }

    private static string QuoteIfNeeded(string s)
    {
        if (s.Length == 0) return "\"\"";
        var looksNumericButNotDate = Regex.IsMatch(s, @"^[-+.\d]+$") && !Regex.IsMatch(s, @"^\d{4}-\d{2}-\d{2}");
        var needsQuote = looksNumericButNotDate
            || Regex.IsMatch(s, @"[:#\[\{}]|" + "\"")
            || s.Contains('\'')
            || s.Trim() != s
            || Regex.IsMatch(s, @"^(true|false|null)$", RegexOptions.IgnoreCase);
        return needsQuote ? JsonSerializer.Serialize(s) : s;
    }

    // ---------- 日期 ----------

    [GeneratedRegex(@"^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$")]
    private static partial Regex NaiveDateRegex();

    /// <summary>任意接受的日期形式 → ISO（UTC，毫秒精度，与 build.mjs 一致）。失败返回 null。</summary>
    public static string? ToIso(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        var dt = ToDateTime(v);
        return dt?.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
    }

    public static DateTime? ToDateTime(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        var s = v.Trim();
        var naive = NaiveDateRegex().Match(s);
        if (naive.Success)
        {
            return new DateTime(
                int.Parse(naive.Groups[1].Value, CultureInfo.InvariantCulture),
                int.Parse(naive.Groups[2].Value, CultureInfo.InvariantCulture),
                int.Parse(naive.Groups[3].Value, CultureInfo.InvariantCulture),
                naive.Groups[4].Success ? int.Parse(naive.Groups[4].Value, CultureInfo.InvariantCulture) : 0,
                naive.Groups[5].Success ? int.Parse(naive.Groups[5].Value, CultureInfo.InvariantCulture) : 0,
                naive.Groups[6].Success ? int.Parse(naive.Groups[6].Value, CultureInfo.InvariantCulture) : 0,
                DateTimeKind.Utc);
        }
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
            return parsed.ToUniversalTime();
        return null;
    }

    // ---------- 摘要（与 public/js/util.js snippet() 同一算法） ----------

    public static string Snippet(string md, int len)
    {
        var text = Regex.Replace(md ?? "", @"```[\s\S]*?```", " ");
        text = Regex.Replace(text, @"!\[[^\]]*\]\([^)]*\)", " ");
        text = Regex.Replace(text, @"\[([^\]]*)\]\([^)]*\)", "$1");
        text = Regex.Replace(text, @"[#>*`_~\-|]", " ");
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return text.Length > len ? text[..len] + "…" : text;
    }

    /// <summary>与 build.mjs 的 slugify 一致（\w = A-Za-z0-9_，外加中文与连字符）。</summary>
    public static string Slugify(string s)
    {
        var lowered = (s ?? "").Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        foreach (var ch in lowered)
        {
            var keep = char.IsAsciiLetterOrDigit(ch) || ch == '_' || ch == '-' || ch is >= '\u4e00' and <= '\u9fa5';
            sb.Append(keep ? ch : '-');
        }
        return Regex.Replace(sb.ToString(), @"-+", "-").Trim('-');
    }
}

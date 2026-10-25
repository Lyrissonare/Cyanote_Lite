using System.IO;

namespace CyanotePublisher;

/// <summary>无 UI 自检：front-matter 解析/序列化、slug、摘要、manifest 合并排序。</summary>
public static class SelfTest
{
    public static bool Run(TextWriter o)
    {
        var pass = 0;
        var fail = 0;
        void Check(string name, bool ok, string detail = "")
        {
            if (ok) { pass++; o.WriteLine($"  [PASS] {name}"); }
            else { fail++; o.WriteLine($"  [FAIL] {name}  {detail}"); }
        }

        o.WriteLine("FrontMatter:");

        var fm = FrontMatter.Parse("""
            ---
            title: 测试：标题
            categories: [技术, 前端]
            tags: ["a b", 'c']
            pinned: true
            views: 42
            ---

            正文
            """);
        Check("解析 inline 数组/引号/布尔/数字",
            fm.Title == "测试：标题"
            && fm.Categories.SequenceEqual(new[] { "技术", "前端" })
            && fm.Tags.SequenceEqual(new[] { "a b", "c" })
            && fm.Pinned && fm.Views == 42
            && fm.Body.Trim() == "正文");

        var fm2 = FrontMatter.Parse("---\nTitle: X\ncategories:\n  - 技术\n  - 随笔\n---\n");
        Check("dash 列表 + 键大小写不敏感", fm2.Title == "X" && fm2.Categories.SequenceEqual(new[] { "技术", "随笔" }));

        var fm3 = FrontMatter.Parse("# 只是一个标题\n\n正文");
        Check("无 front-matter 整体作为正文", !fm3.HasFm && fm3.Body.StartsWith("#"));

        Check("日期 → UTC ISO",
            FrontMatter.ToIso("2025-01-06 09:00") == "2025-01-06T09:00:00.000Z"
            && FrontMatter.ToIso("2025-01-06") == "2025-01-06T00:00:00.000Z"
            && FrontMatter.ToIso("2025-01-06T09:00:00.000Z") == "2025-01-06T09:00:00.000Z"
            && FrontMatter.ToIso("") is null);

        var md = new FrontMatter();
        md.Set("title", "带:冒号 #井号 \"引号\"");
        md.Set("date", "2025-01-06T09:00:00.000Z");
        md.Set("categories", new List<object?> { "技术" });
        md.Set("tags", new List<object?> { "a", "b c" });
        md.Set("pinned", true);
        md.Set("views", 7L);
        md.Set("custom", "keep me");
        var round = FrontMatter.Parse(md.Serialize("正文内容"));
        Check("序列化→解析往返",
            round.Title == "带:冒号 #井号 \"引号\""
            && FrontMatter.ToIso(round.Data["date"]!.ToString()!) == "2025-01-06T09:00:00.000Z"
            && round.Categories.SequenceEqual(new[] { "技术" })
            && round.Tags.SequenceEqual(new[] { "a", "b c" })
            && round.Pinned && round.Views == 7
            && round.Data["custom"] as string == "keep me"
            && round.Body.Trim() == "正文内容");

        Check("slug 规则与 JS 一致",
            FrontMatter.Slugify(" Hello_World 测试! ") == "hello_world-测试"
            && FrontMatter.Slugify("A--B??C") == "a-b-c"
            && FrontMatter.Slugify("中文标题") == "中文标题");

        Check("摘要截取（与 util.js snippet 一致）",
            FrontMatter.Snippet("# 标题\n\n> 引用\n\n正文 `code` 继续", 150) == "标题 引用 正文 code 继续");

        o.WriteLine("Manifest:");
        var manifest = Manifest.Parse("{\"posts\":[]}");
        manifest.Upsert(NewPost("b", "2025-03-01T00:00:00.000Z"));
        manifest.Upsert(NewPost("a", "2025-03-01T00:00:00.000Z"));
        manifest.Upsert(NewPost("c", "2025-01-01T00:00:00.000Z"));
        manifest.Upsert(NewPost("a2", "2025-05-01T00:00:00.000Z"));
        manifest.Upsert(NewPost("a", "2025-06-01T00:00:00.000Z")); // 同 slug 替换
        var order = string.Join(",", manifest.Posts.Select(p => p.Slug));
        // a 被以 6 月日期重新 upsert，因此排最后：c(1月) b(3月) a2(5月) a(6月)
        Check("按 (createdAt, slug) 升序 + 同 slug 替换",
            order == "c,b,a2,a", $"实际顺序: {order}");

        var json = manifest.Serialize();
        Check("JSON 序列化含中文且驼峰缩进",
            json.Contains("\"slug\"") && json.Contains("正文") && json.Contains("  \"posts\""));
        var emojiManifest = Manifest.Parse("{\"posts\":[]}");
        emojiManifest.Upsert(new ManifestPost { Slug = "e", Title = "🌊 暗夜蓝光", Content = "x", Status = "published" });
        Check("emoji 原样输出（与 JSON.stringify 一致，不转义为 \\uD83C...）",
            emojiManifest.Serialize().Contains("🌊 暗夜蓝光") && !emojiManifest.Serialize().Contains("\\u"));

        o.WriteLine($"\n{pass} passed, {fail} failed");
        return fail == 0;
    }

    private static ManifestPost NewPost(string slug, string createdAt) => new()
    {
        Slug = slug,
        Title = $"标题 {slug}",
        Content = "正文",
        Excerpt = "摘要",
        Categories = new List<string> { "技术" },
        Tags = new List<string>(),
        Status = "published",
        Pinned = false,
        Views = 0,
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
        PublishedAt = createdAt,
    };
}

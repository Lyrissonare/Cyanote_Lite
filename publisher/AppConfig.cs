using System.IO;
using System.Text.Json;

namespace CyanotePublisher;

/// <summary>持久化配置：%APPDATA%\CyanotePublisher\config.json。令牌只保存在本机。</summary>
public sealed class AppConfig
{
    public string Repo { get; set; } = "";
    public string Branch { get; set; } = "main";
    public string BasePath { get; set; } = "";
    public string Token { get; set; } = "";
    /// <summary>GitHub API 地址。默认 https://api.github.com；GitHub Enterprise 填 https://<主机>/api/v3</summary>
    public string ApiBase { get; set; } = "https://api.github.com";

    private static string Dir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "CyanotePublisher");

    private static string File => Path.Combine(Dir, "config.json");

    private static readonly JsonSerializerOptions Opts = new() { WriteIndented = true };

    public static AppConfig Load()
    {
        try
        {
            if (System.IO.File.Exists(File))
                return JsonSerializer.Deserialize<AppConfig>(System.IO.File.ReadAllText(File), Opts) ?? new();
        }
        catch { /* 损坏的配置当作空配置 */ }
        return new();
    }

    public void Save()
    {
        Directory.CreateDirectory(Dir);
        System.IO.File.WriteAllText(File, JsonSerializer.Serialize(this, Opts));
    }
}

using System.IO;
using System.Runtime.InteropServices;
using System.Windows;

namespace CyanotePublisher;

public partial class App : Application
{
    [DllImport("kernel32.dll")]
    private static extern bool AttachConsole(int pid);

    public const int AttachParentProcess = -1;

    private static string CrashLog => Path.Combine(Path.GetTempPath(), "CyanotePublisher-crash.log");

    protected override void OnStartup(StartupEventArgs e)
    {
        // 未处理异常一律落盘，避免静默闪退无法排查
        DispatcherUnhandledException += (s, ex) =>
        {
            File.AppendAllText(CrashLog, $"\n[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] UI 线程异常\n{ex.Exception}\n");
            MessageBox.Show(ex.Exception.Message, "Cyanote Publisher 出错", MessageBoxButton.OK, MessageBoxImage.Error);
            ex.Handled = true;
        };
        AppDomain.CurrentDomain.UnhandledException += (s, ex) =>
        {
            File.AppendAllText(CrashLog, $"\n[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 致命异常({ex.IsTerminating})\n{ex.ExceptionObject}\n");
        };
        TaskScheduler.UnobservedTaskException += (s, ex) =>
        {
            File.AppendAllText(CrashLog, $"\n[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] 未观察任务异常\n{ex.Exception}\n");
            ex.SetObserved();
        };

        // --selftest：无 UI 运行解析/合并逻辑自检，供构建验证（退出码 0=通过）
        if (e.Args.Contains("--selftest", StringComparer.OrdinalIgnoreCase))
        {
            AttachConsole(AttachParentProcess);
            var ok = SelfTest.Run(Console.Out);
            Console.Out.Flush();
            Shutdown(ok ? 0 : 1);
            return;
        }
        base.OnStartup(e);
    }
}

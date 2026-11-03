namespace TestProject.src.Application.Interfaces
{
    public interface ISettingsHelper
    {
        string ToRelative(string full);

        string Resolve(string? relativePath);

        string CurrentRoot { get; set; }
    }
}

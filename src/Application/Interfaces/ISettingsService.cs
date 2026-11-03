namespace TestProject.src.Application.Interfaces
{
    public interface ISettingsService
    {
        string GetHome();
        string SetHome(string homePath = "");
    }
}

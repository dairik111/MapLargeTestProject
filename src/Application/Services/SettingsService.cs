using Microsoft.Extensions.Options;
using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;

namespace TestProject.src.Application.Services
{
    public class SettingsService : ISettingsService
    {
        private readonly ISettingsHelper _settingsHelpers;

        public SettingsService(ISettingsHelper settingsHelper)
        {
          _settingsHelpers = settingsHelper;
        }

        public string GetHome() => _settingsHelpers.CurrentRoot;

        public string SetHome(string homePath)
        {
            if (string.IsNullOrWhiteSpace(homePath))
                throw new ArgumentException("Path is required.", nameof(homePath));

            _settingsHelpers.CurrentRoot = homePath;   // validates and throws DirectoryNotFoundException
            return _settingsHelpers.CurrentRoot;
        }
    }
}

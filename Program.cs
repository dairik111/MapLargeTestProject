using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;
using TestProject.src.Application.Services;

namespace TestProject {
    public class Program {
        public static void Main(string[] args) {
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddControllers();

            // Add services to the container.
            builder.Services.Configure<BrowseOptions>(builder.Configuration.GetSection(BrowseOptions.SectionName));

            // Configure services
            builder.Services.AddSingleton<ISettingsHelper, SettingsHelper>(); // Set as Singleton so that it holds the mutable root:
            
            builder.Services.AddScoped<ISettingsService, SettingsService>();
            builder.Services.AddScoped<IDirectorySearchService, DirectorySearchService>();
            builder.Services.AddScoped<IFileUploadDownload,  FileUploadDownloadService>();

            var app = builder.Build();

            app.UseHttpsRedirection();

            app.UseDefaultFiles();
            app.UseStaticFiles();

            app.MapControllers();

            app.Run();
        }
    }
}
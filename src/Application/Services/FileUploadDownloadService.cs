using Microsoft.AspNetCore.StaticFiles;
using System.IO.Compression;
using TestProject.src.Application.Interfaces;
using TestProject.src.Application.Models;

namespace TestProject.src.Application.Services
{
    public class FileUploadDownloadService : IFileUploadDownload
    {
        private readonly ISettingsHelper _settingsHelper;

        public FileUploadDownloadService(ISettingsHelper settingsHelper)
        {
            _settingsHelper = settingsHelper;
        }

        public Task Delete(IEnumerable<string> filesToDelete)
        {
            var fullPaths = GetFilePaths(filesToDelete);

            // GetFilePaths has already resolved every path against home and confirmed each file exists
            // (throwing otherwise), so nothing is deleted unless the whole request is valid.
            foreach (var fullPath in fullPaths)
            {
                File.Delete(fullPath);
            }
            return Task.CompletedTask;
        }

        public async Task<Stream> DownloadFilesAsZip(IEnumerable<string> paths)
        {
            // Resolve and validate every path before building anything: Resolve throws
            // UnauthorizedAccessException for anything outside the home directory.

            var fullPaths = GetFilePaths(paths);

            var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var fullPath in fullPaths)
                {
                    // Home-relative path as the entry name keeps same-named files from different folders distinct
                    var entry = archive.CreateEntry(_settingsHelper.ToRelative(fullPath), CompressionLevel.Optimal);
                    using var entryStream = entry.Open();
                    using var fileStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true);

                    await fileStream.CopyToAsync(entryStream);
                }
            }
            memoryStream.Position = 0;
            return memoryStream; 
        }

        

        /// <summary>
        /// Download a single file
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        /// <exception cref="FileNotFoundException"></exception>
        public Task<FileDownloadInfo> DownloadSingleFile(string path)
        {
            // 1. Resolve the home-relative path; throws UnauthorizedAccessException if it escapes the home directory
            var filePath = _settingsHelper.Resolve(path);
            var sanitizedFileName = Path.GetFileName(filePath);

            // 2. Check if the file exists (directories and missing files both count as not found)
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"File {path} was not found");
            }

            // 3. Determine the content type (MIME type) dynamically
            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(filePath, out var contentType))
            {
                contentType = "application/octet-stream"; // Default fallback
            }

            // 4. Open the stream asynchronously and return it           
            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true);

            return Task.FromResult( new FileDownloadInfo() { FileStream = fileStream, ContentType = contentType, FileName = sanitizedFileName });
        }

        /// <summary>
        /// Upload one or more files to a fixed folder
        /// </summary>
        /// <param name="files">Collection of IFormFile</param>
        /// <returns>Size of files</returns>
        public async Task<long> FileUpload(IEnumerable<IFormFile> files)
        {
            long size = files.Sum(f => f.Length);

            foreach (var formFile in files)
            {
                if (formFile.Length > 0)
                {
                    var uploadDir = UploadDownloadDir();
                    var safeName = Path.GetFileName(formFile.FileName);         // strips any client-supplied path
                    var filePath = Path.Combine(uploadDir, safeName);

                    using var stream = File.Create(filePath);
                    await formFile.CopyToAsync(stream);
                }
            }

            return size;
        }

        #region Helpers

        private List<string> GetFilePaths(IEnumerable<string> paths)
        {
            var fullPaths = new List<string>();
            foreach (var path in paths.Distinct())
            {
                var fullPath = _settingsHelper.Resolve(path);
                if (!File.Exists(fullPath))
                    throw new FileNotFoundException($"File {path} was not found");

                if (!fullPaths.Contains(fullPath))
                    fullPaths.Add(fullPath);
            }

            if (fullPaths.Count == 0)
                throw new ArgumentException("No files were specified.");

            return fullPaths;
        }

        private string UploadDownloadDir() {
            var root = Path.GetPathRoot(Environment.SystemDirectory); //Get the root of c: or the primary volume root

            string dir = Path.GetTempPath();
            if (root != null)
            {
                dir = Path.Combine(root, "Temp", "UploadedFiles");
                Directory.CreateDirectory(dir);// no-op if it exists

                return dir;
            }
            return dir;
        }

        #endregion

    }
}

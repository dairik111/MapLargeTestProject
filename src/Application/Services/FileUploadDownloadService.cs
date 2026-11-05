using System.Security.Principal;
using TestProject.src.Application.Interfaces;

namespace TestProject.src.Application.Services
{
    public class FileUploadDownloadService : IFileUploadDownload
    {
        public async Task<long> FileUpload(List<IFormFile> files)
        {
            long size = files.Sum(f => f.Length);

            foreach (var formFile in files)
            {
                if (formFile.Length > 0)
                {
                    //var filePath = Path.GetTempFileName();
                    var root = Path.GetPathRoot(Environment.SystemDirectory); //Get the root of c: or the primary volume root
                    
                    if (root != null)
                    {
                        // We're writing to a fixed, controlled directory c:\Temp\UploadedFiles
                        var uploadDir = Path.Combine(root, "Temp", "UploadedFiles");
                        Directory.CreateDirectory(uploadDir);                       // no-op if it exists

                        var safeName = Path.GetFileName(formFile.FileName);         // strips any client-supplied path
                        var filePath = Path.Combine(uploadDir, safeName);

                        using var stream = File.Create(filePath);
                        await formFile.CopyToAsync(stream);
                    }
                }
            }

            return size;
        }
    }
}

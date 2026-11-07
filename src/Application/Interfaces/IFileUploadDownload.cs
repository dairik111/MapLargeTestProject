using TestProject.src.Application.Models;

namespace TestProject.src.Application.Interfaces
{
    public interface IFileUploadDownload
    {
        Task<long> FileUpload(IEnumerable<IFormFile> files);

        Task Delete(IEnumerable<string> filesToDelete);

        Task<FileDownloadInfo> DownloadSingleFile(string path);

        Task<Stream> DownloadFilesAsZip(IEnumerable<string> paths);
    }
}

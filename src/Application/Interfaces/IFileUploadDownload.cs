using TestProject.src.Application.Models;

namespace TestProject.src.Application.Interfaces
{
    public interface IFileUploadDownload
    {
        Task<long> FileUpload(List<IFormFile> files);

        Task<FileDownloadInfo> DownloadSingleFile(string path);

        Task<Stream> DownloadFilesAsZip(IEnumerable<string> paths);
    }
}

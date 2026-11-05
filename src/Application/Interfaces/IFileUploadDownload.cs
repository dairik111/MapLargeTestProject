namespace TestProject.src.Application.Interfaces
{
    public interface IFileUploadDownload
    {

        Task<long> FileUpload(List<IFormFile> files);
    }
}

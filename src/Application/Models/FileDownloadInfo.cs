namespace TestProject.src.Application.Models
{
    public class FileDownloadInfo
    {
        public required Stream FileStream { get; set; }
        public required string ContentType { get; set; }
        public required string FileName { get; set; }
    }
}

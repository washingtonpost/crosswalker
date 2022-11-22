/**
 * Downloads an object into a JSON file
 * @param filename The download file filename
 * @param contentsString The text to download
 */
export function download(filename: string, contentsString: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([contentsString], { type: "application/json" })
  );
  a.download = filename;
  a.click();
}

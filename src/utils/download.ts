export function download(filename: string, contentsJson: any) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(contentsJson)], { type: "application/json" })
  );
  a.download = filename;
  a.click();
}

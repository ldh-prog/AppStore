/**
 * 브라우저가 R2로 직접 PUT한다.
 * 설치 파일을 Next.js로 경유시키면 Vercel 요청 본문 한도(4.5MB)에 걸린다.
 */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`업로드가 거절되었습니다. (${xhr.status})`));
    };
    xhr.onerror = () => {
      reject(
        new Error(
          "네트워크 오류로 업로드하지 못했습니다. R2 버킷 CORS에 이 사이트 출처의 PUT이 허용돼 있는지 확인해 주세요.",
        ),
      );
    };
    xhr.send(file);
  });
}

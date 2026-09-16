/**
 * 교체용 일러스트 슬롯. src/assets/chuseok/ 에 아래 이름으로 파일을 넣으면 SVG placeholder 대신 그 이미지를 쓴다.
 *   landing.(png|jpg|webp)  — 랜딩 화면 달 토끼 자리
 *   loading.(png|jpg|webp)  — 결과 계산 로딩 화면 자리
 * 빌드 시점에 glob 으로 해석되므로 Cloudflare 런타임에서 파일 시스템을 읽지 않는다.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/chuseok/*.{png,jpg,jpeg,webp}', {
  eager: true,
});

function find(stem: string): string | null {
  for (const [path, mod] of Object.entries(files)) {
    if (new RegExp(`/${stem}\\.(png|jpe?g|webp)$`).test(path)) return mod.default.src;
  }
  return null;
}

export const artwork = {
  landing: find('landing'),
  loading: find('loading'),
};

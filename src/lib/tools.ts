export type Tool = {
  slug: string;
  title: string;
  short: string;
  description: string;
  hint: string;
  kind: 'compress' | 'crop' | 'convert';
  icon: string;
  target?: number;
  ratio?: number;
  width?: number;
  height?: number;
  format?: 'image/jpeg' | 'image/png';
  accept: string;
  faqs: [string, string][];
};
const images = 'image/jpeg,image/png,image/webp';
export const tools: Tool[] = [
  { slug: 'compress-image', title: 'Kompres foto', short: 'Kompres foto', description: 'Kecilkan ukuran foto JPG, PNG, atau WebP. Pilih batas ukuran file atau atur kualitasnya sendiri.', hint: 'Ukuran lebih kecil, tetap enak dilihat.', kind: 'compress', icon: 'compress', accept: images, faqs: [['Apakah format foto berubah?', 'Hasil kompresi disimpan sebagai JPG. Area transparan akan menjadi putih. Foto asli di perangkat Anda tetap utuh.'], ['Apakah dimensi foto berubah?', 'Kompresi biasa mempertahankan dimensi foto. Jika memilih target KB, dimensi dapat diperkecil agar hasil memenuhi batas ukuran.']] },
  ...[100, 200, 500].map((target): Tool => ({ slug: `compress-image-${target}kb`, title: `Kompres foto ke ${target} KB`, short: `Kompres ${target} KB`, description: `Untuk formulir yang membatasi ukuran foto hingga ${target} KB. Pilih foto, kompres, lalu simpan hasilnya.`, hint: `Pas untuk batas upload ${target} KB.`, kind: 'compress', icon: 'compress', target, accept: images, faqs: [[`Apakah hasil selalu di bawah ${target} KB?`, `Tool mencari kualitas JPG tertinggi yang memenuhi batas ${target} × 1.024 byte. Jika perlu, dimensi foto ikut diperkecil. Jika batas tidak dapat dicapai, pesan kesalahan akan ditampilkan.`], ['Apakah kualitas foto berkurang?', 'Kompresi JPG dapat mengurangi detail. Periksa preview hasil sebelum digunakan, terutama untuk foto dengan teks kecil. File asli tidak diubah.']] })),
  ...[{ label: '3×4', slug: '3x4', ratio: 3 / 4, width: 354, height: 472 }, { label: '4×6', slug: '4x6', ratio: 4 / 6, width: 472, height: 708 }].map((p): Tool => ({ slug: `resize-foto-${p.slug}`, title: `Buat pas foto ${p.label}`, short: `Foto ${p.label}`, description: `Potong foto ke rasio ${p.label}. Atur posisi wajah pada preview, lalu simpan hasilnya sebagai JPG.`, hint: 'Pas foto untuk urusan administrasi.', kind: 'crop', icon: 'crop', ratio: p.ratio, width: p.width, height: p.height, accept: images, faqs: [['Bagaimana cara mengatur potongan foto?', 'Geser foto pada preview atau gunakan pengatur posisi horizontal, vertikal, dan zoom. Preview menunjukkan potongan yang akan disimpan.'], ['Berapa ukuran hasil dalam piksel?', `Hasil JPG berukuran ${p.width} × ${p.height} piksel dengan rasio ${p.label}. Untuk mencetak dalam sentimeter, atur ukuran cetak pada aplikasi atau layanan cetak. Periksa persyaratan instansi sebelum mengunggah.`]] })),
  { slug: 'png-to-jpg', title: 'PNG ke JPG', short: 'PNG ke JPG', description: 'Ubah gambar PNG menjadi JPG. Kalau latarnya transparan, pilih warna untuk menggantikannya.', hint: 'Ubah format, beres dalam satu langkah.', kind: 'convert', icon: 'convert', format: 'image/jpeg', accept: 'image/png', faqs: [['Apa yang terjadi dengan latar transparan?', 'JPG tidak mendukung transparansi. Bagian transparan diganti dengan warna latar yang Anda pilih; warna awalnya putih.'], ['Apakah ukuran gambar berubah?', 'Dimensi gambar tetap sama. Ukuran file dapat berubah karena JPG menggunakan kompresi.']] },
  { slug: 'jpg-to-png', title: 'JPG ke PNG', short: 'JPG ke PNG', description: 'Ubah foto JPG menjadi PNG dengan dimensi yang sama. Foto asli tetap tersimpan di perangkat Anda.', hint: 'Format PNG, tanpa instal aplikasi.', kind: 'convert', icon: 'convert', format: 'image/png', accept: 'image/jpeg', faqs: [['Apakah konversi meningkatkan kualitas?', 'Konversi mempertahankan gambar yang sudah ada. Detail yang hilang saat kompresi JPG tidak dapat dikembalikan.'], ['Mengapa file PNG lebih besar?', 'PNG menyimpan gambar tanpa kompresi lossy tambahan. Untuk foto, hasil PNG biasanya lebih besar daripada JPG.']] },
];
export const featured = ['compress-image-200kb', 'resize-foto-3x4', 'resize-foto-4x6', 'png-to-jpg'];

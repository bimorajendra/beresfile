import type { Tool } from './tools';

export type ToolContent = {
  heading: string;
  paragraphs: string[];
  checklistTitle: string;
  checklist: string[];
  faqs: [string, string][];
};

export function contentFor(tool: Tool): ToolContent {
  if (tool.kind === 'compress' && tool.target) {
    const kb = tool.target;
    const intent: Record<number, [string, string]> = {
      100: ['Foto untuk formulir dengan batas 100 KB', 'Batas 100 KB cukup kecil untuk sebuah foto. Mulai dari foto asli yang wajah atau tulisannya sudah jelas, supaya hasil kompresi masih bisa diperiksa. Memotong bagian foto yang tidak dibutuhkan terlebih dahulu juga dapat membantu mempertahankan detail utama.'],
      200: ['Menyiapkan foto untuk upload maksimal 200 KB', 'Jika halaman pendaftaran meminta foto maksimal 200 KB, gunakan preset 200 KB di atas. Setelah diproses, periksa preview dan ukuran hasil sebelum menyimpannya. Ikuti juga ketentuan format dan dimensi dari penyelenggara; ukuran file saja belum tentu cukup.'],
      500: ['Mengecilkan foto hingga 500 KB', 'Preset 500 KB berguna ketika formulir memberi ruang lebih besar untuk foto. Jika foto yang sama sudah terlihat baik pada 200 KB, Anda bisa tetap memakai hasil itu. Gunakan batas yang diminta formulir sebagai patokan, bukan alasan untuk selalu membuat foto sekecil mungkin.'],
    };
    return {
      heading: intent[kb][0],
      paragraphs: [intent[kb][1], `Alat menyesuaikan kompresi dan dimensi pada format pilihan agar memenuhi batas ${kb} KB. Bila kualitas saja belum cukup, dimensi foto ikut diperkecil. Angka ${kb} KB adalah batas atas, bukan ukuran yang harus tepat sama; hasil yang lebih kecil tetap memenuhi target.`],
      checklistTitle: 'Periksa sebelum diunggah',
      checklist: ['Wajah atau tulisan penting masih jelas pada preview.', 'Formulir menerima format pilihan dan dimensi hasilnya.', 'File yang diunggah adalah hasil download, bukan foto asli yang lebih besar.'],
      faqs: [
        ['Formulir tetap menolak foto. Apa yang harus diperiksa?', `Cek format, dimensi minimum, dan batas ukuran pada formulir. Tool ini memakai 1 KB = 1.024 byte; sebagian formulir bisa menghitungnya berbeda. Jika ukurannya terlalu dekat dengan batas ${kb} KB, pilih Ukuran lain dan coba target sedikit lebih kecil.`],
        ['Bagaimana kalau foto asli sudah lebih kecil dari batas?', 'Anda bisa memakai foto asli jika format dan dimensinya juga sesuai. Kompresi tambahan tidak diperlukan dan dapat mengurangi detail.'],
        ['Bisa memakai target ukuran yang berbeda?', 'Bisa. Pilih salah satu preset atau tekan Ukuran lain, lalu masukkan target dalam KB. Untuk batas 1 MB, gunakan preset 1 MB yang setara dengan 1.024 KB.'],
      ],
    };
  }
  if (tool.kind === 'compress') return {
    heading: 'Pilih batas ukuran, atau atur kualitas sendiri',
    paragraphs: ['Kalau foto akan diunggah ke formulir, lihat dulu batas ukuran file yang tertulis di sana. Pilih preset 50, 100, 200, 300, atau 500 KB, maupun 1 MB. Untuk batas lain, gunakan Ukuran lain dan masukkan angkanya dalam KB.', 'Kalau tidak ada batas yang harus dipenuhi, gunakan Atur kualitas. Kualitas yang lebih rendah biasanya menghasilkan file lebih kecil, tetapi detail bisa berkurang. Mode kualitas mempertahankan dimensi; mode target dapat mengecilkan dimensi agar batas ukuran tercapai. Pilih hasil JPG, PNG, atau WebP. PNG mempertahankan transparansi; JPG mengisi bagian transparan dengan putih.'],
    checklistTitle: 'Pilih pengaturan yang sesuai',
    checklist: ['Ada batas upload: pakai preset atau input KB bebas.', 'Tidak ada batas upload: mulai dari kualitas 80%, lalu periksa hasilnya.', 'PNG transparan: bagian transparan akan menjadi putih pada hasil JPG.'],
    faqs: [
      ['Kenapa hasil kompresi kadang lebih besar dari foto asli?', 'Mengubah PNG atau WebP yang sudah efisien menjadi JPG tidak selalu membuat file lebih kecil. Perbandingan ukuran ditampilkan pada hasil. Jika tidak perlu mengubah format, Anda bisa tetap memakai foto asli.'],
      ['Apakah 1 MB sama dengan 1.000 KB?', 'Di alat ini, preset 1 MB memakai 1.024 KB. Kalau formulir menggunakan 1.000 KB atau menetapkan jumlah byte tertentu, pilih Ukuran lain dan pakai batas yang lebih kecil sesuai ketentuannya.'],
      ['Bisakah dipakai untuk foto dokumen?', 'Bisa, tetapi periksa teks kecil setelah kompresi. Jika tulisan menjadi sulit dibaca, naikkan target ukuran atau kualitas selama masih memenuhi batas formulir.'],
    ],
  };
  if (tool.kind === 'crop') {
    const ratio = tool.slug.endsWith('2x3') ? '2×3' : tool.slug.endsWith('3x4') ? '3×4' : '4×6';
    return {
      heading: `Menyiapkan pas foto dengan rasio ${ratio}`,
      paragraphs: [`Foto ${ratio} dibuat dengan memotong gambar ke rasio ${ratio}, bukan menarik gambar hingga wajah berubah bentuk. Pilih foto yang memiliki ruang cukup di sekitar kepala dan bahu. Gunakan zoom serta posisi horizontal dan vertikal untuk menentukan bagian yang masuk ke hasil.`, `Hasilnya berupa JPG ${tool.width} × ${tool.height} piksel. Rasio gambar dan ukuran cetak adalah dua hal berbeda: untuk mencetak ${ratio.replace('×', ' × ')} cm, ukuran cetak perlu diatur pada aplikasi atau layanan cetak. Tool ini tidak mengenali wajah otomatis dan tidak mengganti latar foto.`],
      checklistTitle: 'Cek ketentuan pas foto',
      checklist: ['Seluruh bagian wajah yang diperlukan masuk ke preview.', 'Pose dan warna latar sesuai persyaratan penyelenggara.', 'Dimensi serta ukuran file hasil sesuai dengan batas formulir.'],
      faqs: [
        ['Kenapa sebagian foto terpotong?', `Foto asli mungkin memiliki rasio berbeda dari ${ratio}. Pemotongan diperlukan agar proporsi wajah tetap normal. Geser foto atau kurangi zoom untuk menyertakan bagian yang Anda butuhkan.`],
        ['Apakah latar foto bisa otomatis menjadi merah atau biru?', 'Belum. Alat ini hanya mengatur potongan dan ukuran foto. Gunakan foto yang latarnya sudah sesuai dengan persyaratan.'],
        ['Bagaimana jika file pas foto masih terlalu besar?', 'Isi Batas ukuran (KB) sebelum membuat pas foto. Dimensi tetap terjaga; jika batas tidak tercapai, naikkan batas KB dan periksa kembali ketentuan formulir.'],
      ],
    };
  }
  if (tool.kind === 'resize') return {
    heading: 'Sesuaikan dimensi foto tanpa mengubah file asli',
    paragraphs: ['Pilih lebar dan tinggi dalam piksel atau persentase dari ukuran asli. Kunci rasio menjaga proporsi; buka hanya jika Anda membutuhkan ukuran yang berbeda.', 'Pilih JPG, PNG, atau WebP. Ukuran piksel berbeda dari ukuran file dalam KB. Memperbesar foto tidak mengembalikan detail yang hilang.'],
    checklistTitle: 'Periksa ukuran yang diperlukan',
    checklist: ['Pastikan lebar dan tinggi sesuai persyaratan.', 'Pertahankan kunci rasio agar wajah tidak berubah bentuk.', 'Gunakan PNG atau WebP jika transparansi diperlukan.'],
    faqs: [['Mengapa hasil lebih besar dalam KB?', 'Ukuran file juga bergantung pada format dan isi gambar. Periksa hasil, lalu kompres jika dibutuhkan.']],
  };
  const format = tool.format === 'image/jpeg' ? 'JPG' : tool.format === 'image/webp' ? 'WebP' : 'PNG';
  return {
    heading: `Mengubah gambar menjadi ${format}`,
    paragraphs: [`Gunakan konversi untuk menghasilkan file ${format} yang sebenarnya. Mengganti ekstensi nama file saja tidak mengubah format data. Dimensi gambar dipertahankan.`, format === 'JPG' ? 'JPG tidak menyimpan transparansi. Area transparan akan diisi warna pilihan Anda; putih adalah pilihan awal.' : `${format} mendukung transparansi, tetapi konversi tidak menghapus latar yang sudah menjadi bagian gambar. Detail yang sebelumnya hilang tidak dapat dipulihkan.`],
    checklistTitle: 'Periksa sebelum menyimpan',
    checklist: [`Pastikan aplikasi tujuan menerima ${format}.`, 'Periksa ukuran file dan detail pada preview.', 'Simpan file asli jika masih diperlukan; gambar animasi menghasilkan gambar diam.'],
    faqs: [
      ['Apakah hasil selalu lebih kecil?', 'Tidak. Ukuran bergantung pada format dan isi gambar. Perbandingan ukuran ditampilkan setelah proses.'],
      ['Bagaimana jika ada batas KB?', `Gunakan alat kompres dan pilih ${format} sebagai format hasil. Periksa dimensi serta kualitas setelah kompresi.`],
    ],
  };
}

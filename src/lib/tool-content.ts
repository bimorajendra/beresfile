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
      paragraphs: [intent[kb][1], `Alat mencari kualitas JPG yang memenuhi batas ${kb} KB. Bila kualitas saja belum cukup, dimensi foto ikut diperkecil. Angka ${kb} KB adalah batas atas, bukan ukuran yang harus tepat sama; hasil yang lebih kecil tetap memenuhi target.`],
      checklistTitle: 'Periksa sebelum diunggah',
      checklist: ['Wajah atau tulisan penting masih jelas pada preview.', 'Formulir menerima format JPG dan dimensi hasilnya.', 'File yang diunggah adalah hasil download, bukan foto asli yang lebih besar.'],
      faqs: [
        ['Formulir tetap menolak foto. Apa yang harus diperiksa?', `Cek format, dimensi minimum, dan batas ukuran pada formulir. Tool ini memakai 1 KB = 1.024 byte; sebagian formulir bisa menghitungnya berbeda. Jika ukurannya terlalu dekat dengan batas ${kb} KB, pilih Ukuran lain dan coba target sedikit lebih kecil.`],
        ['Bagaimana kalau foto asli sudah lebih kecil dari batas?', 'Anda bisa memakai foto asli jika format dan dimensinya juga sesuai. Kompresi tambahan tidak diperlukan dan dapat mengurangi detail.'],
        ['Bisa memakai target ukuran yang berbeda?', 'Bisa. Pilih salah satu preset atau tekan Ukuran lain, lalu masukkan target dalam KB. Untuk batas 1 MB, gunakan preset 1 MB yang setara dengan 1.024 KB.'],
      ],
    };
  }
  if (tool.kind === 'compress') return {
    heading: 'Pilih batas ukuran, atau atur kualitas sendiri',
    paragraphs: ['Kalau foto akan diunggah ke formulir, lihat dulu batas ukuran file yang tertulis di sana. Pilih preset 50, 100, 200, 300, atau 500 KB, maupun 1 MB. Untuk batas lain, gunakan Ukuran lain dan masukkan angkanya dalam KB.', 'Kalau tidak ada batas yang harus dipenuhi, gunakan Atur kualitas. Kualitas yang lebih rendah biasanya menghasilkan file lebih kecil, tetapi detail bisa berkurang. Mode kualitas mempertahankan dimensi; mode target dapat mengecilkan dimensi agar batas ukuran tercapai. Semua hasil kompresi disimpan sebagai JPG.'],
    checklistTitle: 'Pilih pengaturan yang sesuai',
    checklist: ['Ada batas upload: pakai preset atau input KB bebas.', 'Tidak ada batas upload: mulai dari kualitas 80%, lalu periksa hasilnya.', 'PNG transparan: bagian transparan akan menjadi putih pada hasil JPG.'],
    faqs: [
      ['Kenapa hasil kompresi kadang lebih besar dari foto asli?', 'Mengubah PNG atau WebP yang sudah efisien menjadi JPG tidak selalu membuat file lebih kecil. Perbandingan ukuran ditampilkan pada hasil. Jika tidak perlu mengubah format, Anda bisa tetap memakai foto asli.'],
      ['Apakah 1 MB sama dengan 1.000 KB?', 'Di alat ini, preset 1 MB memakai 1.024 KB. Kalau formulir menggunakan 1.000 KB atau menetapkan jumlah byte tertentu, pilih Ukuran lain dan pakai batas yang lebih kecil sesuai ketentuannya.'],
      ['Bisakah dipakai untuk foto dokumen?', 'Bisa, tetapi periksa teks kecil setelah kompresi. Jika tulisan menjadi sulit dibaca, naikkan target ukuran atau kualitas selama masih memenuhi batas formulir.'],
    ],
  };
  if (tool.kind === 'crop') {
    const ratio = tool.slug.endsWith('3x4') ? '3×4' : '4×6';
    return {
      heading: `Menyiapkan pas foto dengan rasio ${ratio}`,
      paragraphs: [`Foto ${ratio} dibuat dengan memotong gambar ke rasio ${ratio}, bukan menarik gambar hingga wajah berubah bentuk. Pilih foto yang memiliki ruang cukup di sekitar kepala dan bahu. Gunakan zoom serta posisi horizontal dan vertikal untuk menentukan bagian yang masuk ke hasil.`, `Hasilnya berupa JPG ${tool.width} × ${tool.height} piksel. Rasio gambar dan ukuran cetak adalah dua hal berbeda: untuk mencetak ${ratio.replace('×', ' × ')} cm, ukuran cetak perlu diatur pada aplikasi atau layanan cetak. Tool ini tidak mengenali wajah otomatis dan tidak mengganti latar foto.`],
      checklistTitle: 'Cek ketentuan pas foto',
      checklist: ['Seluruh bagian wajah yang diperlukan masuk ke preview.', 'Pose dan warna latar sesuai persyaratan penyelenggara.', 'Dimensi serta ukuran file hasil sesuai dengan batas formulir.'],
      faqs: [
        ['Kenapa sebagian foto terpotong?', `Foto asli mungkin memiliki rasio berbeda dari ${ratio}. Pemotongan diperlukan agar proporsi wajah tetap normal. Geser foto atau kurangi zoom untuk menyertakan bagian yang Anda butuhkan.`],
        ['Apakah latar foto bisa otomatis menjadi merah atau biru?', 'Belum. Alat ini hanya mengatur potongan dan ukuran foto. Gunakan foto yang latarnya sudah sesuai dengan persyaratan.'],
        ['Bagaimana jika file pas foto masih terlalu besar?', 'Simpan hasil potongan terlebih dahulu, lalu buka alat kompres foto. Pilih batas KB dari formulir dan periksa lagi ketajaman wajah setelah kompresi.'],
      ],
    };
  }
  if (tool.format === 'image/jpeg') return {
    heading: 'Mengubah PNG agar bisa dipakai sebagai JPG',
    paragraphs: ['Beberapa formulir hanya menerima JPG. Mengganti nama file dari .png menjadi .jpg tidak mengubah format gambar; gunakan konversi di atas agar hasil benar-benar berupa JPG. Dimensi gambar tetap sama dengan gambar awal.', 'JPG tidak menyimpan transparansi. Jika PNG memiliki latar transparan, area itu akan diisi warna pilihan Anda; putih dipilih secara default. Konversi juga menggunakan kompresi JPG, jadi periksa tulisan, garis tipis, atau tepi logo sebelum hasilnya dipakai.'],
    checklistTitle: 'Perhatikan gambar transparan',
    checklist: ['Pilih warna latar yang cocok dengan tempat gambar akan digunakan.', 'Periksa detail kecil pada preview hasil JPG.', 'Kalau ada batas KB, lanjutkan dengan alat kompres setelah konversi.'],
    faqs: [
      ['Mengapa latar transparan hilang?', 'Itu batas format JPG, bukan kerusakan gambar. Pakai PNG asli jika transparansi masih diperlukan.'],
      ['Apakah JPG pasti lebih kecil daripada PNG?', 'Tidak selalu. JPG biasanya lebih efisien untuk foto, sedangkan PNG dapat lebih efisien untuk gambar sederhana. Ukuran sebelum dan sesudah ditampilkan agar bisa dibandingkan.'],
      ['Bisa mengganti warna latar foto yang sudah ada?', 'Pemilih warna hanya mengisi area transparan pada PNG. Warna latar yang sudah menjadi bagian gambar tidak dihapus atau diganti.'],
    ],
  };
  return {
    heading: 'Saat gambar perlu disimpan dalam format PNG',
    paragraphs: ['Gunakan alat ini ketika aplikasi atau formulir meminta format PNG. Hasilnya adalah file PNG yang sebenarnya, bukan sekadar JPG yang diganti ekstensi namanya. Dimensi gambar dipertahankan.', 'PNG menyimpan gambar tanpa menambahkan kompresi lossy seperti JPG. Namun konversi tidak dapat mengembalikan detail yang sebelumnya hilang pada foto JPG. Untuk foto, file PNG juga biasanya lebih besar, jadi perhatikan batas ukuran saat akan diunggah.'],
    checklistTitle: 'Sebelum memilih PNG',
    checklist: ['Pastikan format PNG memang diperlukan oleh aplikasi atau formulir.', 'Periksa ukuran hasil, terutama untuk foto beresolusi tinggi.', 'Simpan JPG asli jika Anda masih membutuhkan file yang lebih kecil.'],
    faqs: [
      ['Apakah latar foto akan menjadi transparan?', 'Tidak. JPG tidak menyimpan transparansi, dan konversi ini tidak menghapus latarnya. Latar yang sudah ada tetap menjadi bagian gambar PNG.'],
      ['Apakah mengganti ekstensi menjadi .png cukup?', 'Tidak. Nama file dan format data gambar berbeda. Download dari alat ini menghasilkan data PNG yang bisa dibaca aplikasi pendukungnya.'],
      ['Bagaimana kalau hasil PNG terlalu besar untuk formulir?', 'Periksa apakah formulir juga menerima JPG. Jika iya, JPG biasanya lebih cocok untuk foto. Alat kompres saat ini menghasilkan JPG, jadi jangan menggunakannya jika format PNG wajib dipertahankan.'],
    ],
  };
}

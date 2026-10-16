import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

interface StaticPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

/** Kerangka halaman statis (Tentang, Bantuan, Syarat, Privasi). */
function StaticPage({ title, intro, children }: StaticPageProps) {
  useEffect(() => {
    document.title = `${title} - StreamFlix`;
    window.scrollTo({ top: 0 });
  }, [title]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
        {title}
      </h1>
      {intro ? <p className="mt-3 text-text-muted">{intro}</p> : null}
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-text-muted [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </div>
  );
}

export function AboutPage() {
  const { data: settings } = usePublicSettings();
  const name = settings?.siteName ?? 'StreamFlix';
  return (
    <StaticPage
      title="Tentang"
      intro={`${name} adalah layanan streaming film sederhana untuk menonton di peramban.`}
    >
      <p>
        {name} menampilkan katalog film yang dikelola melalui dashboard admin.
        Pengunjung dapat menjelajah genre, mencari judul, memutar film, serta
        menyimpan film ke Daftar Saya dan melanjutkan tontonan.
      </p>
      <p>
        Situs ini dibuat sebagai proyek perangkat lunak. Seluruh judul dan data
        contoh yang ditampilkan bersifat fiktif dan hanya untuk keperluan
        pengembangan.
      </p>
      <p>
        Semua poster dan banner yang tidak tersedia diganti dengan placeholder
        gradien yang dibuat sendiri, sehingga tidak menggunakan materi berhak
        cipta.
      </p>
    </StaticPage>
  );
}

export function HelpPage() {
  return (
    <StaticPage
      title="Bantuan"
      intro="Panduan singkat menggunakan StreamFlix."
    >
      <h2>Menonton film</h2>
      <p>
        Buka halaman detail film lalu tekan tombol <strong>Putar Sekarang</strong>.
        Video akan diputar di halaman tonton.
      </p>
      <h2>Daftar Saya</h2>
      <p>
        Tekan tombol <strong>Daftar Saya</strong> pada film untuk menyimpannya.
        Daftar disimpan di peramban Anda dan dapat dibuka dari menu Daftar Saya.
      </p>
      <h2>Lanjutkan Menonton</h2>
      <p>
        Posisi tontonan disimpan otomatis di peramban. Bila Anda berhenti di
        tengah film, baris Lanjutkan Menonton akan muncul di beranda.
      </p>
      <h2>Video tidak dapat diputar</h2>
      <p>
        Beberapa sumber video mungkin membatasi akses atau tidak mendukung
        pemutaran langsung. Tekan tombol <strong>Coba Lagi</strong> atau muat ulang
        halaman.
      </p>
      <h2>Masih butuh bantuan?</h2>
      <p>
        Hubungi pengelola situs melalui tautan sosial pada footer bila tersedia.
      </p>
    </StaticPage>
  );
}

export function TermsPage() {
  return (
    <StaticPage
      title="Syarat & Ketentuan"
      intro="Dengan menggunakan StreamFlix, Anda menyetujui ketentuan berikut."
    >
      <h2>Penggunaan layanan</h2>
      <p>
        Layanan ini disediakan apa adanya untuk keperluan demonstrasi dan
        pengembangan. Pengguna bertanggung jawab atas cara penggunaan situs.
      </p>
      <h2>Konten</h2>
      <p>
        Judul film dan data contoh bersifat fiktif. Pengelola wajib hanya
        menautkan sumber video yang dimiliki atau yang memiliki izin distribusi.
      </p>
      <h2>Batasan tanggung jawab</h2>
      <p>
        Pengelola tidak menjamin ketersediaan sumber video pihak ketiga. Sumber
        dapat gagal, memblokir hotlink, atau membatasi akses kapan saja.
      </p>
    </StaticPage>
  );
}

export function PrivacyPage() {
  return (
    <StaticPage
      title="Kebijakan Privasi"
      intro="Kami menghargai privasi Anda. Berikut ringkasan data yang diproses."
    >
      <h2>Data yang disimpan di peramban Anda</h2>
      <ul>
        <li>
          <strong>Daftar Saya</strong> (kunci <code>streamflix:my-list</code>) —
          daftar slug film yang Anda simpan.
        </li>
        <li>
          <strong>Progres tontonan</strong> (kunci{' '}
          <code>streamflix:watch-progress</code>) — posisi dan durasi tontonan
          terakhir.
        </li>
      </ul>
      <p>
        Data tersebut hanya tersimpan di peramban Anda (localStorage), tidak
        dikirim ke server, dan dapat Anda hapus kapan saja dengan membersihkan
        data situs di peramban.
      </p>
      <h2>Data di server</h2>
      <p>
        Situs mencatat jumlah penayangan film secara agregat (tanpa identitas
        pribadi). Sesi hanya dibuat untuk area admin yang memerlukan login.
      </p>
      <h2>Cookie</h2>
      <p>
        Cookie sesi hanya digunakan untuk autentikasi admin. Pengunjung publik
        tidak memerlukan cookie untuk menjelajah katalog.
      </p>
    </StaticPage>
  );
}

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Halaman tidak ditemukan - StreamFlix';
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-text-primary">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Halaman yang Anda cari tidak ada atau sudah dipindahkan.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
        <Link to="/movies">
          <Button
            variant="secondary"
            leftIcon={<Compass className="size-4" />}
          >
            Jelajahi Film
          </Button>
        </Link>
      </div>
    </div>
  );
}

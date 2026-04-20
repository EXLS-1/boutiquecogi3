import socialData from "@/data/social-data.json";

export default function SocialNetworks() {
  const { whatsapp, facebook, telegram, tiktok, instagram } = socialData.social;
  
  return (
    <section className="py-20 bg-gray-50 border-t border-gray-200" id="reseaux">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4">
            SUIVEZ-NOUS
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            Restez connecté avec notre communauté
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="#"
            className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-[#25D366] text-white transition-transform hover:-translate-y-2 shadow-lg shadow-[#25D366]/30 gap-2"
          >
            <i className="fab fa-whatsapp text-3xl"></i>
            <span className="text-xs font-bold uppercase tracking-wider">
              WhatsApp
            </span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-[#1877F2] text-white transition-transform hover:-translate-y-2 shadow-lg shadow-[#1877F2]/30 gap-2"
          >
            <i className="fab fa-facebook text-3xl"></i>
            <span className="text-xs font-bold uppercase tracking-wider">
              Facebook
            </span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-[#0088cc] text-white transition-transform hover:-translate-y-2 shadow-lg shadow-[#0088cc]/30 gap-2"
          >
            <i className="fab fa-telegram text-3xl"></i>
            <span className="text-xs font-bold uppercase tracking-wider">
              Telegram
            </span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-black text-white transition-transform hover:-translate-y-2 shadow-lg shadow-black/30 gap-2"
          >
            <i className="fab fa-tiktok text-3xl"></i>
            <span className="text-xs font-bold uppercase tracking-wider">
              TikTok
            </span>
          </a>
          <a
            href="#"
            className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-linear-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white transition-transform hover:-translate-y-2 shadow-lg gap-2"
          >
            <i className="fab fa-instagram text-3xl"></i>
            <span className="text-xs font-bold uppercase tracking-wider">
              Instagram
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
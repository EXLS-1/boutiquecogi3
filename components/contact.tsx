// components/contact.tsx
export default function Contact() {
  return (
    <section className="py-20 bg-white" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4">
            CONTACTEZ-NOUS
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            Nous sommes là pour vous aider
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          {/* Info Contact */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-black text-xl shrink-0">
                <i className="fas fa-envelope"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1 uppercase tracking-widest">
                  E-mail
                </h4>
                <p className="text-gray-600">contact@boutiquecogi.com</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center text-2xl shrink-0">
                <i className="fab fa-whatsapp"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1 uppercase tracking-widest">
                  WhatsApp
                </h4>
                <p className="text-gray-600">+243 XX XX XX XX XX</p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="bg-gray-50 p-8 rounded-2xl">
            <form className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="Votre nom"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Votre e-mail"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                />
              </div>
              <div>
                <textarea
                  placeholder="Votre message"
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-lg font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors shadow-lg shadow-black/20"
              >
                <span>ENVOYER</span>
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
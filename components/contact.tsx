// components/contact.tsx

"use client";

import { useState } from "react";

interface ContactProps {
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  emailValue?: string;
  whatsappLabel?: string;
  whatsappValue?: string;
  buttonText?: string;
  placeholders?: {
    name?: string;
    email?: string;
    message?: string;
  };
  onSubmit?: (data: { name: string; email: string; message: string }) => void;
}

export default function Contact({
  title = "CONTACTEZ-NOUS",
  subtitle = "Nous sommes là pour vous aider",
  emailLabel = "E-mail",
  emailValue = "contact@boutiquecogi.com",
  whatsappLabel = "WhatsApp",
  whatsappValue = "+243 XX XX XX XX XX",
  buttonText = "ENVOYER",
  placeholders = {
    name: "Votre nom",
    email: "Votre e-mail",
    message: "Votre message",
  },
  onSubmit,
}: ContactProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
      // Optionnel : Réinitialiser le formulaire après soumission
      setFormData({ name: "", email: "", message: "" });
    }
  };

  return (
    <section className="py-20 bg-white" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4">
            {title}
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            {subtitle}
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
                  {emailLabel}
                </h4>
                <p className="text-gray-600">{emailValue}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center text-2xl shrink-0">
                <i className="fab fa-whatsapp"></i>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1 uppercase tracking-widest">
                  {whatsappLabel}
                </h4>
                <p className="text-gray-600">{whatsappValue}</p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="bg-gray-50 p-8 rounded-2xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <input
                  type="text"
                  placeholder={placeholders.name}
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder={placeholders.email}
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                />
              </div>
              <div>
                <textarea
                  placeholder={placeholders.message}
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-lg font-bold tracking-widest uppercase hover:bg-cyan-400 hover:text-black transition-colors shadow-lg shadow-black/20"
              >
                <span>{buttonText}</span>
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
'use client';

import useCart from '@/store/use-cart';

export default function CartPage() {
  const cart = useCart();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Panier</h1>
      {cart.items.length === 0 ? (
        <p>Votre panier est vide.</p>
      ) : (
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                <div>
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p className="text-gray-600">{item.price} €</p>
                </div>
              </div>
              <div className="flex items-center gap-x-3 border rounded-lg px-2 py-1">
                <button
                  onClick={() => cart.updateQuantity(item.id, 'decrease')}
                  className="text-lg font-bold hover:text-blue-600"
                >
                  -
                </button>
                <span className="text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQuantity(item.id, 'increase')}
                  className="text-lg font-bold hover:text-blue-600"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => cart.removeItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={cart.removeAll}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Vider le panier
            </button>
            <div className="text-lg font-bold">
              Total: {cart.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)} €
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

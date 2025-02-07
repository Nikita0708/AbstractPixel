import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WalletModal = ({ isOpen, onClose, onConnect }) => {
  const wallets = [
    {
      name: "MetaMask",
      icon: (
        <svg
          viewBox="0 0 35 33"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
        >
          <path
            d="M32.9582 1L19.8241 10.7183L22.2864 4.99099L32.9582 1Z"
            fill="#E17726"
            stroke="#E17726"
            strokeWidth="0.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.65179 1L15.6752 10.809L13.3235 4.99098L2.65179 1Z"
            fill="#E27625"
            stroke="#E27625"
            strokeWidth="0.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28.2295 23.5335L24.7435 28.8874L32.2675 30.9189L34.3899 23.6501L28.2295 23.5335Z"
            fill="#E27625"
            stroke="#E27625"
            strokeWidth="0.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M1.27124 23.6501L3.37863 30.9189L10.9027 28.8874L7.41664 23.5335L1.27124 23.6501Z"
            fill="#E27625"
            stroke="#E27625"
            strokeWidth="0.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      description: "Connect using your MetaMask wallet",
      onClick: () => onConnect("metamask"),
    },
    {
      name: "Zerion",
      icon: (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
        >
          <path
            d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
            fill="#2962EF"
          />
          <path
            d="M21.5 12.5L16 8L10.5 12.5L16 17L21.5 12.5ZM10.5 19.5L16 24L21.5 19.5L16 15L10.5 19.5Z"
            fill="white"
          />
        </svg>
      ),
      description: "Connect using Zerion Wallet",
      onClick: () => onConnect("zerion"),
    },
    {
      name: "Rabby",
      icon: (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
        >
          <rect width="32" height="32" rx="8" fill="#8697FF" />
          <path
            d="M23 11.5C23 15.0899 20.0899 18 16.5 18C12.9101 18 10 15.0899 10 11.5C10 7.91015 12.9101 5 16.5 5C20.0899 5 23 7.91015 23 11.5Z"
            fill="white"
          />
          <path
            d="M16.5 27C20.0899 27 23 24.0899 23 20.5C23 16.9101 20.0899 14 16.5 14C12.9101 14 10 16.9101 10 20.5C10 24.0899 12.9101 27 16.5 27Z"
            fill="white"
          />
        </svg>
      ),
      description: "Connect using Rabby Wallet",
      onClick: () => onConnect("rabby"),
    },
    {
      name: "Coinbase Wallet",
      icon: (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
        >
          <path
            d="M16 0C7.16341 0 0 7.16341 0 16C0 24.8366 7.16341 32 16 32C24.8366 32 32 24.8366 32 16C32 7.16341 24.8366 0 16 0Z"
            fill="#2C5FF6"
          />
          <path
            d="M16.0006 5.33325C21.8906 5.33325 26.6673 10.1099 26.6673 15.9999C26.6673 21.8899 21.8906 26.6666 16.0006 26.6666C10.1106 26.6666 5.33398 21.8899 5.33398 15.9999C5.33398 10.1099 10.1106 5.33325 16.0006 5.33325Z"
            fill="white"
          />
          <path
            d="M16.0004 11.9999C17.4731 11.9999 18.6671 13.1939 18.6671 14.6666V17.3333C18.6671 18.8059 17.4731 19.9999 16.0004 19.9999C14.5277 19.9999 13.3337 18.8059 13.3337 17.3333V14.6666C13.3337 13.1939 14.5277 11.9999 16.0004 11.9999Z"
            fill="#2C5FF6"
          />
        </svg>
      ),
      description: "Connect using Coinbase Wallet",
      onClick: () => onConnect("coinbase"),
    },
    {
      name: "Trust Wallet",
      icon: (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
        >
          <path
            d="M16 0L29.3333 4.57333V14.2933C29.3333 21.9733 23.68 28.9067 16 30.6667C8.32 28.9067 2.66667 21.9733 2.66667 14.2933V4.57333L16 0Z"
            fill="#3375BB"
          />
          <path
            d="M16.0007 7.46667L9.33398 10.8V15.4667C9.33398 20.2667 12.8007 24.5333 16.0007 25.6C19.2007 24.5333 22.6673 20.2667 22.6673 15.4667V10.8L16.0007 7.46667Z"
            fill="white"
          />
        </svg>
      ),
      description: "Connect using Trust Wallet",
      onClick: () => onConnect("trust"),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid gap-4">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={wallet.onClick}
                className="flex items-center p-4 gap-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors w-full text-left"
              >
                {wallet.icon}
                <div>
                  <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
                  <p className="text-sm text-gray-500">{wallet.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;

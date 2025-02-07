import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WalletModal = ({ isOpen, onClose, onConnect }: any) => {
  const wallets = [
    {
      name: "MetaMask",
      icon: "/metamask.png",
      description: "Connect using your MetaMask wallet",
      onClick: () => onConnect("metamask"),
    },
    {
      name: "Zerion",
      icon: "/zerion.png",
      description: "Connect using Zerion Wallet",
      onClick: () => onConnect("zerion"),
    },
    {
      name: "Rabby",
      icon: "/rabby.png",
      description: "Connect using Rabby Wallet",
      onClick: () => onConnect("rabby"),
    },
    {
      name: "Coinbase Wallet",
      icon: "/coinbase.png",
      description: "Connect using Coinbase Wallet",
      onClick: () => onConnect("coinbase"),
    },
    {
      name: "Trust Wallet",
      icon: "/trust.png",
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
                <img src={wallet.icon} alt={wallet.name} className="w-8 h-8" />
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

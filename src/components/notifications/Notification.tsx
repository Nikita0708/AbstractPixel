import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export const useStatusNotification = () => {
  const { toast } = useToast();

  const showNotification = (message: any, type = "default") => {
    const variants: any = {
      success: {
        title: "Success",
        variant: "default",
        className: "bg-[#07c983] text-white border-green-600",
      },
      error: {
        title: "Error",
        variant: "default",
        className: "bg-red-500 text-white border-red-600",
      },
      default: {
        title: "Notification",
        variant: "default",
        className: "bg-gray-100 text-gray-900",
      },
    };

    const { title, variant, className } = variants[type] || variants.default;

    toast({
      title,
      description: message,
      variant,
      className,
      action:
        type === "error" ? (
          <ToastAction
            altText="Try again"
            className="border-white text-white hover:bg-red-600"
          >
            Try again
          </ToastAction>
        ) : undefined,
    });
  };

  return { showNotification };
};

export const NotificationProvider = ({ children }: any) => {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
};

export default NotificationProvider;

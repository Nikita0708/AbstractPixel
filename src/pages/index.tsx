import DefaultLayout from "@/layouts/default";
import SmallDevice from "./SmallDevice";
import PixelBoard from "@/components/PixelBoard";

export default function IndexPage() {
  return (
    <DefaultLayout>
      {/* Hide main content on small screens, show on sm and up */}
      <div className="hidden sm:block">
        <PixelBoard />
      </div>

      {/* Show SmallDevice component only on small screens */}
      <div className="block sm:hidden">
        <SmallDevice />
      </div>
    </DefaultLayout>
  );
}

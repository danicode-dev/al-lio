import Image from "next/image";
import type { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#F5F2EC] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#DDD7CE] bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/al_lio_logo_horizontal_transparent.png"
            alt="AL LÍO"
            width={220}
            height={77}
            style={{ width: 180, height: "auto" }}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}

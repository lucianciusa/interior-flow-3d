import { useParams } from "next/navigation";
import { useWizardStore } from "@/lib/stores/wizard";
import { useGetRoom } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function RightInspector({ isFloating }: { isFloating: boolean }) {
  const params = useParams<{ roomId?: string }>();
  const roomId = params?.roomId;
  
  const roomQuery = useGetRoom(roomId);
  
  const roomType = useWizardStore((s) => s.roomType);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);

  // If floating (result view), show scene details
  if (isFloating) {
    return (
      <aside className="absolute bottom-4 right-4 top-16 w-80 overflow-hidden rounded-xl border bg-background shadow-lg transition-transform duration-300 ease-in-out z-50">
        <div className="h-full flex flex-col p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Scene Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Room Type</p>
              <p className="text-sm font-medium capitalize">{roomType.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dimensions</p>
              <p className="text-sm font-medium">{dims.width_m}m x {dims.length_m}m x {dims.height_m}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Style</p>
              <p className="text-sm font-medium capitalize">{style || "Not selected"}</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // If in a room page, show room specifications
  if (roomId && roomQuery.data) {
    const room = roomQuery.data;
    const area = room.width_m * room.length_m;
    
    return (
      <aside className="hidden lg:flex w-80 flex-col border-l bg-background p-6">
        <h3 className="text-lg font-semibold mb-6 tracking-tight font-display text-foreground">Room Specs</h3>
        
        <div className="space-y-6">
          <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Dimensions</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Width</span>
                <span className="text-xs font-medium">{room.width_m.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Length</span>
                <span className="text-xs font-medium">{room.length_m.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Height</span>
                <span className="text-xs font-medium">{room.height_m.toFixed(2)}m</span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-foreground">Total Area</span>
                <span className="text-sm font-bold text-primary">{area.toFixed(1)} m²</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/30 p-4 border border-dashed border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Room Type</p>
            <p className="text-sm font-medium capitalize text-foreground">{room.room_type.replace("_", " ")}</p>
          </div>

          <div className="p-2">
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              Use the Inspector to verify room constraints before generating new layouts.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (roomId && roomQuery.isLoading) {
    return (
      <aside className="hidden lg:flex w-80 flex-col border-l bg-background p-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </aside>
    );
  }

  // Default Wizard Inspector
  return (
    <aside className="hidden lg:flex w-80 flex-col border-l bg-background p-6">
      <h3 className="text-lg font-semibold mb-6 tracking-tight font-display text-foreground">Inspector</h3>
      
      <div className="space-y-6">
        <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Current Config</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border capitalize">{roomType.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Size</span>
              <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border">{dims.width_m}x{dims.length_m}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Style</span>
              <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border capitalize">{style || "None"}</span>
            </div>
          </div>
        </div>

        <div className="p-2">
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            Your design is being updated in real-time as you progress through the wizard.
          </p>
        </div>
      </div>
    </aside>
  );
}
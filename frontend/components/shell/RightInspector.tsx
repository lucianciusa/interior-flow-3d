export function RightInspector({ isFloating }: { isFloating: boolean }) {
  if (isFloating) {
    // Top-16 right-4 floating panel for the result page
    return (
      <aside className="absolute bottom-4 right-4 top-16 w-80 overflow-hidden rounded-xl border bg-background shadow-lg transition-transform duration-300 ease-in-out z-10 z-index-dropdown">
        <div className="h-full flex flex-col p-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">Inspector Panel (Floating)</p>
        </div>
      </aside>
    );
  }

  // Inline collapsible panel for static pages
  return (
    <aside className="hidden lg:flex w-80 flex-col border-l bg-background p-4">
      <h3 className="text-lg font-semibold mb-4 tracking-tight font-display text-foreground">Inspector</h3>
      <p className="text-sm text-muted-foreground font-body">Select an item to inspect its details.</p>
    </aside>
  );
}
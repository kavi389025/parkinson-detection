export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        This tool is for research and screening only. It is not a medical
        device and does not diagnose Parkinson's disease. Consult a qualified
        neurologist for diagnosis.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-semibold text-foreground">Medical disclaimer</p>
      <p className="mt-1 text-muted-foreground">
        This application is a research and self-screening tool. It is not a
        diagnostic device and must not be used as a substitute for
        professional medical advice. Always consult a qualified neurologist
        for evaluation of Parkinson's disease.
      </p>
    </div>
  );
}
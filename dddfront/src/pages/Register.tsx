import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  MapPin,
  CheckCircle2,
  FileText,
  Upload,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  X,
  Hash,
  Briefcase,
  ClipboardList,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  LEGAL_DOCUMENT_CATEGORIES,
  legalDocumentLabel,
  type LegalDocumentCategory,
} from "@/lib/legalDocuments";

type IdentificationForm = {
  nom_entreprise: string;
  ninea: string;
  rccm: string;
  adresse: string;
  telephone: string;
  email: string;
  name: string;
  password: string;
  password_confirmation: string;
  references_professionnelles: string;
};

const EMPTY_IDENTIFICATION: IdentificationForm = {
  nom_entreprise: "",
  ninea: "",
  rccm: "",
  adresse: "",
  telephone: "",
  email: "",
  name: "",
  password: "",
  password_confirmation: "",
  references_professionnelles: "",
};

const DRAFT_STORAGE_KEY = "ddd_fournisseur_register_draft_v1";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ".pdf,.jpg,.jpeg,.png";

type StepDefinition = {
  id: 1 | 2 | 3;
  title: string;
  subtitle: string;
};

const STEPS: StepDefinition[] = [
  {
    id: 1,
    title: "Identification",
    subtitle: "Informations entreprise & compte d'accès",
  },
  {
    id: 2,
    title: "Pièces justificatives",
    subtitle: "Documents légaux obligatoires",
  },
  {
    id: 3,
    title: "Récapitulatif",
    subtitle: "Vérification et soumission du dossier",
  },
];

function formatBytes(size: number): string {
  if (size <= 0) return "0 Ko";
  const units = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Register() {
  const navigate = useNavigate();
  const { api } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<IdentificationForm>(() => {
    if (typeof window === "undefined") return EMPTY_IDENTIFICATION;
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<IdentificationForm>;
        return { ...EMPTY_IDENTIFICATION, ...parsed };
      }
    } catch {
      // ignore
    }
    return EMPTY_IDENTIFICATION;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [filesByCategory, setFilesByCategory] = useState<
    Partial<Record<LegalDocumentCategory, File>>
  >({});
  const [autresFiles, setAutresFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Sauvegarde brouillon (texte uniquement — les fichiers ne sont pas sérialisables)
  useEffect(() => {
    if (submitted) return;
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore (quota plein, mode privé, etc.)
    }
  }, [form, submitted]);

  const missingMandatory = useMemo<LegalDocumentCategory[]>(
    () => LEGAL_DOCUMENT_CATEGORIES.filter((c) => !filesByCategory[c]),
    [filesByCategory],
  );

  const handleField =
    (field: keyof IdentificationForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setStepErrors((prev) => ({ ...prev, [field]: "" }));
      setApiError(null);
    };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nom_entreprise.trim()) errors.nom_entreprise = "La raison sociale est obligatoire.";
    if (!form.adresse.trim()) errors.adresse = "L'adresse est obligatoire.";
    if (!form.telephone.trim()) errors.telephone = "Le téléphone est obligatoire.";
    if (!form.name.trim()) errors.name = "Le nom du contact est obligatoire.";
    if (!form.email.trim()) {
      errors.email = "L'adresse email est obligatoire.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      errors.email = "Adresse email invalide.";
    }
    if (!form.password) {
      errors.password = "Le mot de passe est obligatoire.";
    } else if (form.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (form.password !== form.password_confirmation) {
      errors.password_confirmation = "Les mots de passe ne correspondent pas.";
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    if (missingMandatory.length > 0) {
      toast({
        title: "Pièces manquantes",
        description: `Il manque ${missingMandatory.length} pièce(s) obligatoire(s).`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez corriger les champs indiqués avant de continuer.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && !validateStep2()) {
      return;
    }
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const handlePickFile =
    (categorie: LegalDocumentCategory) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setFileErrors((prev) => ({
          ...prev,
          [categorie]: "Le fichier dépasse 10 Mo.",
        }));
        return;
      }
      setFilesByCategory((prev) => ({ ...prev, [categorie]: file }));
      setFileErrors((prev) => ({ ...prev, [categorie]: "" }));
    };

  const handleRemoveFile = (categorie: LegalDocumentCategory) => {
    setFilesByCategory((prev) => {
      const next = { ...prev };
      delete next[categorie];
      return next;
    });
  };

  const handleAddAutres = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= MAX_FILE_BYTES);
    if (valid.length !== files.length) {
      toast({
        title: "Fichier ignoré",
        description: "Certains fichiers dépassent 10 Mo et n'ont pas été ajoutés.",
        variant: "destructive",
      });
    }
    setAutresFiles((prev) => [...prev, ...valid].slice(0, 5));
    e.target.value = "";
  };

  const handleRemoveAutre = (index: number) => {
    setAutresFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setCurrentStep(missingMandatory.length > 0 ? 2 : 1);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email);
    fd.append("password", form.password);
    fd.append("password_confirmation", form.password_confirmation);
    fd.append("nom_entreprise", form.nom_entreprise);
    fd.append("adresse", form.adresse);
    fd.append("telephone", form.telephone);
    if (form.ninea) fd.append("ninea", form.ninea);
    if (form.rccm) fd.append("rccm", form.rccm);
    if (form.references_professionnelles)
      fd.append("references_professionnelles", form.references_professionnelles);

    for (const cat of LEGAL_DOCUMENT_CATEGORIES) {
      const file = filesByCategory[cat];
      if (file) {
        fd.append(`documents[${cat}]`, file);
      }
    }
    autresFiles.forEach((f) => fd.append("documents[AUTRE][]", f));

    try {
      // Récupère le cookie XSRF avant le POST stateful (Sanctum)
      await api.get("/sanctum/csrf-cookie");
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Override du Content-Type par défaut (JSON) pour que le navigateur
      // pose lui-même le boundary multipart/form-data adapté au FormData.
      await api.post("/api/register-fournisseur", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitted(true);
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      toast({
        title: "Dossier soumis avec succès",
        description:
          "Votre dossier est en attente de validation par l'administrateur. Vous serez notifié dès qu'il sera traité.",
      });
      navigate("/connexion", { replace: true });
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };
      const data = error.response?.data;
      const flatErrors: string[] = [];
      if (data?.errors) {
        for (const arr of Object.values(data.errors)) {
          if (Array.isArray(arr)) flatErrors.push(...arr);
        }
      }
      const message =
        flatErrors[0] || data?.message || "Une erreur est survenue lors de la soumission.";
      setApiError(message);
      toast({
        title: "Échec de la soumission",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <Header />

      <main className="flex-1 py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl mx-auto"
        >
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Inscription Fournisseur</CardTitle>
              <CardDescription>
                Renseignez votre dossier complet. Il sera validé par l'administrateur
                après examen.
              </CardDescription>
            </CardHeader>

            <Stepper currentStep={currentStep} />

            <CardContent className="pt-2">
              {apiError && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              {currentStep === 1 && (
                <Step1Identification
                  form={form}
                  errors={stepErrors}
                  onChange={handleField}
                  showPassword={showPassword}
                  showConfirmPassword={showConfirmPassword}
                  toggleShowPassword={() => setShowPassword((v) => !v)}
                  toggleShowConfirmPassword={() => setShowConfirmPassword((v) => !v)}
                />
              )}

              {currentStep === 2 && (
                <Step2Documents
                  filesByCategory={filesByCategory}
                  autresFiles={autresFiles}
                  fileErrors={fileErrors}
                  missingMandatory={missingMandatory}
                  onPickFile={handlePickFile}
                  onRemoveFile={handleRemoveFile}
                  onAddAutres={handleAddAutres}
                  onRemoveAutre={handleRemoveAutre}
                />
              )}

              {currentStep === 3 && (
                <Step3Recap
                  form={form}
                  filesByCategory={filesByCategory}
                  autresFiles={autresFiles}
                  missingMandatory={missingMandatory}
                />
              )}

              <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                {currentStep > 1 ? (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={submitting}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Précédent
                  </Button>
                ) : (
                  <Link to="/connexion" className="text-sm text-muted-foreground hover:underline">
                    Déjà inscrit ? Se connecter
                  </Link>
                )}

                {currentStep < 3 ? (
                  <Button onClick={handleNext} className="gap-2">
                    Suivant <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || missingMandatory.length > 0}
                    className="gap-2"
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Soumission en cours..." : "Soumettre mon dossier"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="px-6 pb-4">
      <div className="flex items-start justify-between gap-2">
        {STEPS.map((s, idx) => {
          const isDone = currentStep > s.id;
          const isCurrent = currentStep === s.id;
          return (
            <div key={s.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground",
                  ].join(" ")}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                </div>
                <div className="mt-2 text-xs font-medium truncate w-full">{s.title}</div>
                <div className="text-[11px] text-muted-foreground truncate w-full hidden sm:block">
                  {s.subtitle}
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    "h-0.5 flex-1 mx-1 mb-6",
                    currentStep > s.id ? "bg-primary" : "bg-muted-foreground/20",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step1Identification(props: {
  form: IdentificationForm;
  errors: Record<string, string>;
  onChange: (
    field: keyof IdentificationForm,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  showPassword: boolean;
  showConfirmPassword: boolean;
  toggleShowPassword: () => void;
  toggleShowConfirmPassword: () => void;
}) {
  const {
    form,
    errors,
    onChange,
    showPassword,
    showConfirmPassword,
    toggleShowPassword,
    toggleShowConfirmPassword,
  } = props;
  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<Building2 className="w-4 h-4" />}
        title="Informations sur l'entreprise"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldText
          id="nom_entreprise"
          label="Raison sociale *"
          icon={<Building2 className="w-4 h-4" />}
          value={form.nom_entreprise}
          onChange={onChange("nom_entreprise")}
          error={errors.nom_entreprise}
          placeholder="Nom de l'entreprise"
        />
        <FieldText
          id="ninea"
          label="NINEA"
          icon={<Hash className="w-4 h-4" />}
          value={form.ninea}
          onChange={onChange("ninea")}
          placeholder="Ex. 000151663"
        />
        <FieldText
          id="rccm"
          label="Registre de commerce (RCCM)"
          icon={<ClipboardList className="w-4 h-4" />}
          value={form.rccm}
          onChange={onChange("rccm")}
          placeholder="Ex. SN-DKR-1997-B-1234"
        />
        <FieldText
          id="adresse"
          label="Adresse *"
          icon={<MapPin className="w-4 h-4" />}
          value={form.adresse}
          onChange={onChange("adresse")}
          error={errors.adresse}
          placeholder="Adresse complète"
        />
        <FieldText
          id="telephone"
          label="Téléphone *"
          icon={<Phone className="w-4 h-4" />}
          type="tel"
          value={form.telephone}
          onChange={onChange("telephone")}
          error={errors.telephone}
          placeholder="+221 77 000 00 00"
        />
        <FieldText
          id="email"
          label="Adresse email *"
          icon={<Mail className="w-4 h-4" />}
          type="email"
          value={form.email}
          onChange={onChange("email")}
          error={errors.email}
          placeholder="contact@entreprise.sn"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="references_professionnelles" className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          Références professionnelles (optionnel)
        </Label>
        <Textarea
          id="references_professionnelles"
          placeholder="Décrivez brièvement vos références ou expériences récentes…"
          value={form.references_professionnelles}
          onChange={onChange("references_professionnelles")}
          rows={3}
        />
      </div>

      <SectionHeading
        icon={<UserIcon className="w-4 h-4" />}
        title="Compte d'accès à la plateforme"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldText
          id="name"
          label="Nom du responsable contact *"
          icon={<UserIcon className="w-4 h-4" />}
          value={form.name}
          onChange={onChange("name")}
          error={errors.name}
          placeholder="Prénom et nom"
        />
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              value={form.password}
              onChange={onChange("password")}
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password_confirmation">Confirmer le mot de passe *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password_confirmation"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              value={form.password_confirmation}
              onChange={onChange("password_confirmation")}
            />
            <button
              type="button"
              onClick={toggleShowConfirmPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password_confirmation && (
            <p className="text-destructive text-sm">{errors.password_confirmation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Step2Documents(props: {
  filesByCategory: Partial<Record<LegalDocumentCategory, File>>;
  autresFiles: File[];
  fileErrors: Record<string, string>;
  missingMandatory: LegalDocumentCategory[];
  onPickFile: (cat: LegalDocumentCategory) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (cat: LegalDocumentCategory) => void;
  onAddAutres: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAutre: (index: number) => void;
}) {
  const {
    filesByCategory,
    autresFiles,
    fileErrors,
    missingMandatory,
    onPickFile,
    onRemoveFile,
    onAddAutres,
    onRemoveAutre,
  } = props;

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Joignez l'ensemble des pièces obligatoires (PDF, JPG ou PNG, 10 Mo max par fichier).
          Sans dossier complet, votre compte ne pourra pas être validé.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LEGAL_DOCUMENT_CATEGORIES.map((cat) => {
          const file = filesByCategory[cat];
          return (
            <FileSlot
              key={cat}
              categorie={cat}
              label={legalDocumentLabel(cat)}
              file={file}
              error={fileErrors[cat]}
              onPick={onPickFile(cat)}
              onRemove={() => onRemoveFile(cat)}
            />
          );
        })}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" /> Autres pièces (optionnel)
        </Label>
        <p className="text-xs text-muted-foreground">
          Jusqu'à 5 fichiers complémentaires (références, agréments, attestations spécifiques…).
        </p>
        <div className="flex flex-wrap gap-2">
          {autresFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="truncate max-w-[180px]">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => onRemoveAutre(i)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Retirer ce fichier"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {autresFiles.length < 5 && (
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
            <Upload className="w-4 h-4" />
            Ajouter un fichier
            <input
              type="file"
              accept={ACCEPTED_MIME}
              multiple
              className="hidden"
              onChange={onAddAutres}
            />
          </label>
        )}
      </div>

      {missingMandatory.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="font-medium text-destructive mb-1">
            {missingMandatory.length} pièce(s) obligatoire(s) manquante(s) :
          </div>
          <ul className="list-disc pl-5 text-destructive/90">
            {missingMandatory.map((c) => (
              <li key={c}>{legalDocumentLabel(c)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Step3Recap(props: {
  form: IdentificationForm;
  filesByCategory: Partial<Record<LegalDocumentCategory, File>>;
  autresFiles: File[];
  missingMandatory: LegalDocumentCategory[];
}) {
  const { form, filesByCategory, autresFiles, missingMandatory } = props;

  return (
    <div className="space-y-5">
      {missingMandatory.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <div>
            Votre dossier est incomplet. Revenez à l'étape « Pièces justificatives » pour ajouter
            les documents manquants avant de soumettre.
          </div>
        </div>
      )}

      <section>
        <SectionHeading
          icon={<Building2 className="w-4 h-4" />}
          title="Informations sur l'entreprise"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <RecapRow label="Raison sociale" value={form.nom_entreprise} />
          <RecapRow label="NINEA" value={form.ninea || "—"} />
          <RecapRow label="RCCM" value={form.rccm || "—"} />
          <RecapRow label="Adresse" value={form.adresse} />
          <RecapRow label="Téléphone" value={form.telephone} />
          <RecapRow label="Email contact" value={form.email} />
          {form.references_professionnelles && (
            <RecapRow
              label="Références"
              value={form.references_professionnelles}
              fullWidth
            />
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<UserIcon className="w-4 h-4" />}
          title="Compte d'accès"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <RecapRow label="Responsable" value={form.name} />
          <RecapRow label="Email de connexion" value={form.email} />
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<FileText className="w-4 h-4" />}
          title="Pièces justificatives"
        />
        <ul className="text-sm space-y-1.5">
          {LEGAL_DOCUMENT_CATEGORIES.map((cat) => {
            const file = filesByCategory[cat];
            return (
              <li key={cat} className="flex items-center justify-between gap-2">
                <span className="text-foreground">{legalDocumentLabel(cat)}</span>
                {file ? (
                  <span className="text-green-600 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> {file.name} ({formatBytes(file.size)})
                  </span>
                ) : (
                  <span className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> manquant
                  </span>
                )}
              </li>
            );
          })}
          {autresFiles.length > 0 && (
            <li className="pt-2 border-t">
              <div className="font-medium mb-1">Autres pièces :</div>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-2">
                {autresFiles.map((f, i) => (
                  <li key={i}>
                    • {f.name} ({formatBytes(f.size)})
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </section>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        Après soumission, votre dossier passera au statut « en attente de validation ». Vous
        recevrez une notification par email dès que l'administrateur l'aura examiné. Vous
        pourrez alors vous connecter.
      </div>
    </div>
  );
}

function FileSlot(props: {
  categorie: LegalDocumentCategory;
  label: string;
  file?: File;
  error?: string;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const { categorie, label, file, error, onPick, onRemove } = props;
  const inputId = `file-${categorie}`;

  return (
    <div
      className={[
        "rounded-md border p-3 transition-colors",
        file ? "border-green-200 bg-green-50/40 dark:bg-green-950/10" : "bg-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-medium leading-tight">{label}</div>
        {file ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-destructive/80 shrink-0">
            Requis
          </span>
        )}
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="truncate">
            <span className="text-foreground">{file.name}</span>
            <span className="text-muted-foreground"> · {formatBytes(file.size)}</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Retirer le fichier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline"
        >
          <Upload className="w-4 h-4" /> Choisir un fichier (PDF/JPG/PNG)
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_MIME}
        onChange={onPick}
        className="hidden"
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function FieldText(props: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}) {
  const { id, label, icon, value, onChange, error, placeholder, type = "text" } = props;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          className="pl-10"
          value={value}
          onChange={onChange}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
      <span className="text-primary">{icon}</span>
      {title}
      <span className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}

function RecapRow({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-foreground break-words">{value || "—"}</div>
    </div>
  );
}

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  School, 
  UserPlus, 
  Plus, 
  Trash2, 
  Users, 
  Mail, 
  Info
} from "lucide-react";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import type { SchoolResponse } from "../../../shared/types/domain";
import {
  createSchool,
  createSchoolAdmin,
  deactivateSchool,
  listSchoolAdmins,
  listSchools
} from "../api/platformApi";

export function PlatformPage() {
  const [newSchool, setNewSchool] = useState({ name: "", code: "" });
  const [selectedSchool, setSelectedSchool] = useState<SchoolResponse | null>(null);
  const [newAdmin, setNewAdmin] = useState({ email: "", fullName: "" });
  const [adminSuccessInfo, setAdminSuccessInfo] = useState<{
    fullName: string;
    email: string;
    temporaryPassword?: string | null;
  } | null>(null);

  // Queries
  const schoolsQuery = useQuery({ 
    queryKey: ["platform", "schools"], 
    queryFn: listSchools 
  });

  const adminsQuery = useQuery({
    queryKey: ["platform", "school-admins", selectedSchool?.id],
    queryFn: () => selectedSchool ? listSchoolAdmins(selectedSchool.id) : Promise.resolve([]),
    enabled: !!selectedSchool
  });

  // Mutations
  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      setNewSchool({ name: "", code: "" });
      void schoolsQuery.refetch();
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSchool,
    onSuccess: () => {
      void schoolsQuery.refetch();
      // Update selected school status locally if it's the one deactivated
      if (selectedSchool) {
        setSelectedSchool(prev => prev ? { ...prev, isActive: false } : null);
      }
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: (request: { email: string; fullName: string }) => {
      if (!selectedSchool) throw new Error("No school selected");
      return createSchoolAdmin(selectedSchool.id, request);
    },
    onSuccess: (data) => {
      setNewAdmin({ email: "", fullName: "" });
      setAdminSuccessInfo({
        fullName: data.fullName,
        email: data.email,
        temporaryPassword: data.temporaryPassword
      });
      void adminsQuery.refetch();
    }
  });

  // Refetch admins when selected school changes
  useEffect(() => {
    setAdminSuccessInfo(null);
  }, [selectedSchool]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Okul ve Sistem Yönetimi" 
        description="Sistem genelindeki spor okullarını, kodlarını, aktiflik durumlarını ve okul yöneticilerini tek merkezden yönetin." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SOL SÜTUN: Okul Listesi ve Okul Ekleme */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Okullar Kartı */}
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <School className="text-primary w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">Kayıtlı Okullar</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary-strong rounded-full">
                {schoolsQuery.data?.length ?? 0} Okul
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/15 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Okul Adı</th>
                    <th className="py-3.5 px-5">Kod</th>
                    <th className="py-3.5 px-5">Durum</th>
                    <th className="py-3.5 px-5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {schoolsQuery.isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        Okullar yükleniyor...
                      </td>
                    </tr>
                  ) : (schoolsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        Sistemde henüz kayıtlı okul bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    (schoolsQuery.data ?? []).map((school) => {
                      const isSelected = selectedSchool?.id === school.id;
                      return (
                        <tr 
                          key={school.id} 
                          onClick={() => setSelectedSchool(school)}
                          className={`group cursor-pointer transition-colors duration-150 ${
                            isSelected 
                              ? "bg-primary/5 hover:bg-primary/5 border-l-4 border-l-primary" 
                              : "hover:bg-muted/30 border-l-4 border-l-transparent"
                          }`}
                        >
                          <td className="py-4 px-5 font-semibold text-foreground group-hover:text-primary transition-colors">
                            {school.name}
                          </td>
                          <td className="py-4 px-5">
                            <code className="text-xs px-2 py-0.5 bg-muted border border-border/80 rounded font-mono text-muted-foreground">
                              {school.code}
                            </code>
                          </td>
                          <td className="py-4 px-5">
                            <StatusBadge value={school.isActive} />
                          </td>
                          <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                                  isSelected 
                                    ? "bg-primary text-white" 
                                    : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                                }`}
                                onClick={() => setSelectedSchool(school)}
                              >
                                Seç
                              </button>
                              
                              {school.isActive && (
                                <button 
                                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                  onClick={() => {
                                    if(confirm(`${school.name} okulunu pasifleştirmek istediğinize emin misiniz?`)) {
                                      deactivateMutation.mutate(school.id);
                                    }
                                  }}
                                  title="Okulu Pasifleştir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Okul Oluşturma Kartı */}
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Plus className="text-primary w-5 h-5" />
              <h3 className="text-base font-bold">Yeni Spor Okulu Ekle</h3>
            </div>
            
            <form 
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (newSchool.name.trim() && newSchool.code.trim()) {
                  createSchoolMutation.mutate(newSchool);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField 
                  label="Okul Adı" 
                  placeholder="Örn: Kadıköy Basketbol Akademisi"
                  value={newSchool.name}
                  onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                  required
                />
                <InputField 
                  label="Okul Kodu (Küçük harf, benzersiz)" 
                  placeholder="Örn: kadikoy-basket"
                  value={newSchool.code}
                  onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                />
              </div>

              {createSchoolMutation.isError && (
                <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                  Okul oluşturulamadı. Kodun benzersiz olduğundan emin olun.
                </div>
              )}

              <button 
                type="submit" 
                className="button button-primary flex items-center justify-center gap-2 w-full md:w-auto"
                disabled={createSchoolMutation.isPending}
              >
                <Plus size={16} />
                {createSchoolMutation.isPending ? "Ekleniyor..." : "Okulu Kaydet"}
              </button>
            </form>
          </div>
        </div>

        {/* SAĞ SÜTUN: Okul Yöneticileri ve Admin Ekleme */}
        <div className="lg:col-span-5">
          {!selectedSchool ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 h-[350px]">
              <div className="p-3 bg-muted rounded-full text-muted-foreground">
                <Users size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Yönetici Paneli</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                  Yöneticilerini listelemek, yeni admin atamak veya şifre üretmek için sol listeden bir okul seçin.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Geçici Şifre Bilgi Kutusu */}
              {adminSuccessInfo && (
                <div className="bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 p-5 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Yönetici Başarıyla Oluşturuldu!</h4>
                      <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                        Kullanıcı için tek seferlik geçici şifre üretilmiştir. Bu şifreyi şimdi kopyalayın, güvenlik gereği bir daha gösterilmeyecektir.
                      </p>
                    </div>
                  </div>
                  <div className="bg-amber-500/20 border border-amber-500/35 p-3 rounded-lg flex flex-col gap-1.5">
                    <div className="text-xs"><span className="opacity-75">Yönetici:</span> <strong>{adminSuccessInfo.fullName}</strong></div>
                    <div className="text-xs"><span className="opacity-75">E-posta:</span> <strong>{adminSuccessInfo.email}</strong></div>
                    <div className="text-xs flex items-center justify-between bg-card px-2.5 py-1.5 rounded border border-border mt-1 select-all">
                      <span>Geçici Şifre: <strong className="font-mono text-sm tracking-wider text-amber-600 dark:text-amber-400">{adminSuccessInfo.temporaryPassword}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Okul Adminleri Kartı */}
              <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="text-primary w-5 h-5" />
                    <div>
                      <h2 className="text-sm font-bold">{selectedSchool.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Okul Yöneticileri Listesi</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {adminsQuery.isLoading ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Yöneticiler yükleniyor...</div>
                  ) : (adminsQuery.data ?? []).length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      Bu okula atanmış bir yönetici bulunmuyor.
                    </div>
                  ) : (
                    (adminsQuery.data ?? []).map((admin) => (
                      <div key={admin.id} className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-lg hover:border-primary/30 transition-all">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary-strong grid place-items-center font-bold text-xs">
                          {admin.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{admin.fullName}</h4>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <Mail size={12} />
                            {admin.email}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary-strong rounded-full uppercase">
                          Admin
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admin Ekleme Kartı */}
              {selectedSchool.isActive ? (
                <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <UserPlus className="text-primary w-5 h-5" />
                    <h3 className="text-base font-bold">Yeni Yönetici Ata</h3>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newAdmin.fullName.trim() && newAdmin.email.trim()) {
                        createAdminMutation.mutate(newAdmin);
                      }
                    }}
                  >
                    <InputField
                      label="Yönetici Ad Soyad"
                      placeholder="Örn: Ahmet Yılmaz"
                      value={newAdmin.fullName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                      required
                    />

                    <InputField
                      label="E-posta Adresi"
                      placeholder="Örn: ahmet@example.com"
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required
                    />

                    {createAdminMutation.isError && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                        Yönetici atanamadı. E-postanın okulda benzersiz olduğundan emin olun.
                      </div>
                    )}

                    <button
                      type="submit"
                      className="button button-primary flex items-center justify-center gap-2 w-full"
                      disabled={createAdminMutation.isPending}
                    >
                      <UserPlus size={16} />
                      {createAdminMutation.isPending ? "Atanıyor..." : "Yönetici Olarak Ata"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-destructive/5 border border-destructive/15 text-destructive p-4 rounded-xl flex items-start gap-2.5 text-xs">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Bu okul pasifleştirildiği için yeni yönetici atanamaz.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

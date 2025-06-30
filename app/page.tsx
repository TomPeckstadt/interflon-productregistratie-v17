"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"

// Supabase imports
import {
  fetchUsers,
  fetchProducts,
  fetchLocations,
  fetchPurposes,
  fetchCategories,
  fetchRegistrations,
  saveUser,
  saveProduct,
  saveLocation,
  savePurpose,
  saveCategory,
  saveRegistration,
  deleteUser,
  deleteProduct,
  deleteLocation,
  deletePurpose,
  deleteCategory,
  subscribeToUsers,
  subscribeToProducts,
  subscribeToLocations,
  subscribeToPurposes,
  subscribeToCategories,
  subscribeToRegistrations,
  isSupabaseConfigured,
  updateUser,
  updateLocation,
  updatePurpose,
  updateProduct,
  updateCategory,
  testSupabaseConnection,
  uploadPDFToStorage,
  deletePDFFromStorage,
  createAuthUser,
  supabase,
} from "@/lib/supabase"

// Auth imports
import { signIn, getCurrentUser, onAuthStateChange, signInWithBadge } from "@/lib/auth"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, QrCode, Edit, LogOut, Lock, Mail } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import QrScannerComponent from "@/components/qr-scanner"

interface Product {
  id: string
  name: string
  qrcode?: string
  categoryId?: string
  created_at?: string
  attachmentUrl?: string
  attachmentName?: string
}

interface Category {
  id: string
  name: string
}

interface Registration {
  id: string
  user: string
  product: string
  location: string
  purpose: string
  timestamp: string
  date: string
  time: string
  qrcode?: string
  created_at?: string
}

export default function ProductRegistrationApp() {
  // ALL HOOKS MUST BE AT THE TOP - NEVER CONDITIONAL
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string>("")

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState("")

  // Basic state
  const [currentUser, setCurrentUser] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [location, setLocation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [importError, setImportError] = useState("")

  // Connection state
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Controleren...")

  // Data arrays - SINGLE SOURCE OF TRUTH
  const [users, setUsers] = useState<{ name: string; role: string; badgeCode?: string }[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [purposes, setPurposes] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  // New item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("none")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Auth user management states
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserLevel, setNewUserLevel] = useState("user")
  const [newUserBadgeCode, setNewUserBadgeCode] = useState("")

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null)
  const [showEditProductDialog, setShowEditProductDialog] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [originalCategory, setOriginalCategory] = useState<Category | null>(null)
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false)

  const [editingUser, setEditingUser] = useState<string>("")
  const [editingUserRole, setEditingUserRole] = useState<string>("user")
  const [editingUserBadgeCode, setEditingUserBadgeCode] = useState<string>("")
  const [originalUser, setOriginalUser] = useState<string>("")
  const [originalUserRole, setOriginalUserRole] = useState<string>("user")
  const [originalUserBadgeCode, setOriginalUserBadgeCode] = useState<string>("")
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)

  const [editingLocation, setEditingLocation] = useState<string>("")
  const [originalLocation, setOriginalLocation] = useState<string>("")
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false)

  const [editingPurpose, setEditingPurpose] = useState<string>("")
  const [originalPurpose, setOriginalPurpose] = useState<string>("")
  const [showEditPurposeDialog, setShowEditPurposeDialog] = useState(false)

  // Product selector states
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productSelectorRef = useRef<HTMLDivElement>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")

  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrScanResult, setQrScanResult] = useState("")
  const [qrScanMode, setQrScanMode] = useState<"registration" | "product-management">("registration")

  // History filtering states
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [selectedHistoryUser, setSelectedHistoryUser] = useState("all")
  const [selectedHistoryLocation, setSelectedHistoryLocation] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("newest")

  // Product search state
  const [productSearchFilter, setProductSearchFilter] = useState("")

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  // Badge login state
  const [badgeId, setBadgeId] = useState("")
  const [badgeError, setBadgeError] = useState("")

  // CSV Import/Export functions
  const handleImportUsersCSV = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)
    setImportMessage("📥 Bezig met lezen van CSV bestand...")

    try {
      const reader = new FileReader()
      reader.onload = async (event: any) => {
        try {
          const csvText = event.target.result
          const lines = csvText.split("\n").filter((line: string) => line.trim())

          if (lines.length === 0) {
            setImportError("CSV bestand is leeg")
            setTimeout(() => setImportError(""), 3000)
            setIsLoading(false)
            return
          }

          // Parse header
          const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""))
          console.log("📋 CSV Headers:", headers)

          let successCount = 0
          let errorCount = 0

          // Process data rows (skip header)
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v: string) => v.trim().replace(/"/g, ""))

            if (values.length < 3) {
              console.log(`❌ Skipping row ${i} - insufficient columns`)
              errorCount++
              continue
            }

            const userData = {
              name: values[0]?.trim(),
              email: values[1]?.trim(),
              password: values[2]?.trim(),
              level: values[3]?.trim() || "user",
              badgeCode: values[4]?.trim() || "",
            }

            // Validation
            if (!userData.name || !userData.email || !userData.password) {
              console.log(`❌ Skipping row ${i} - missing required fields`)
              errorCount++
              continue
            }

            if (userData.password.length < 6) {
              console.log(`❌ Skipping row ${i} - password too short`)
              errorCount++
              continue
            }

            // Check if user already exists
            const existingUser = users.find((u) => u.name === userData.name)
            if (existingUser) {
              console.log(`❌ Skipping row ${i} - user already exists`)
              errorCount++
              continue
            }

            try {
              setImportMessage(`👤 Bezig met aanmaken gebruiker: ${userData.name}...`)

              const result = await createAuthUser(userData.email, userData.password, userData.name, userData.level)

              if (result.error) {
                console.error(`❌ Error creating user ${userData.name}:`, result.error)
                errorCount++
                continue
              }

              // Save badge code if provided
              if (userData.badgeCode) {
                const badgeResult = await saveBadgeCode(userData.badgeCode, userData.email, userData.name)
                if (!badgeResult.success) {
                  console.warn(`⚠️ User created but badge failed for ${userData.name}`)
                }
              }

              successCount++
              console.log(`✅ Successfully created user: ${userData.name}`)

              // Small delay to prevent overwhelming the system
              await new Promise((resolve) => setTimeout(resolve, 500))
            } catch (error) {
              console.error(`❌ Exception creating user ${userData.name}:`, error)
              errorCount++
            }
          }

          // Refresh users list
          await refreshUsersWithBadges()

          if (successCount > 0) {
            setImportMessage(
              `✅ ${successCount} gebruikers succesvol geïmporteerd!${errorCount > 0 ? ` (${errorCount} fouten)` : ""}`,
            )
          } else {
            setImportError(`❌ Geen gebruikers geïmporteerd. ${errorCount} fouten gevonden.`)
          }

          setTimeout(() => {
            setImportMessage("")
            setImportError("")
          }, 5000)
        } catch (error) {
          console.error("❌ Error parsing CSV file:", error)
          setImportError("Fout bij lezen van CSV bestand. Zorg ervoor dat het een geldig CSV bestand is.")
          setTimeout(() => setImportError(""), 5000)
        } finally {
          setIsLoading(false)
        }
      }

      reader.onerror = () => {
        setImportError("Fout bij lezen van bestand")
        setTimeout(() => setImportError(""), 3000)
        setIsLoading(false)
      }

      reader.readAsText(file)
    } catch (error) {
      console.error("❌ Error importing CSV:", error)
      setImportError("Fout bij importeren van CSV bestand")
      setTimeout(() => setImportError(""), 3000)
      setIsLoading(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleExportUsersCSV = async () => {
    try {
      setImportMessage("📤 Bezig met exporteren naar CSV...")
      if (
        !confirm(
          "⚠️ WAARSCHUWING: De CSV zal tijdelijke wachtwoorden bevatten (TempPass123). Gebruikers moeten deze wijzigen na import. Doorgaan?",
        )
      ) {
        setIsLoading(false)
        return
      }

      // Prepare data for export
      const csvRows = []

      // Add header
      csvRows.push('Naam,Email,Wachtwoord,Niveau,"Badge Code"')

      // Add data rows
      users.forEach((user) => {
        const email = `${user.name.toLowerCase().replace(/\s+/g, ".")}@dematic.com`
        const row = [
          `"${user.name}"`,
          `"${email}"`,
          `"${generateRandomPassword()}"`, // Random generated password
          `"${user.role}"`,
          `"${user.badgeCode || ""}"`,
        ].join(",")
        csvRows.push(row)
      })

      const csvContent = csvRows.join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", "gebruikers_export.csv")
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setImportMessage("✅ Gebruikers geëxporteerd naar CSV!")
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("❌ Error exporting to CSV:", error)
      setImportError("Fout bij exporteren naar CSV")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  const downloadUserTemplate = async () => {
    try {
      setImportMessage("📄 Bezig met maken van template...")

      // Create CSV template with headers and example data
      const csvRows = [
        'Naam,Email,Wachtwoord,Niveau,"Badge Code"',
        '"Jan Janssen","jan.janssen@dematic.com","nieuw_wachtwoord123","user","BADGE001"',
        '"Marie Peeters","marie.peeters@dematic.com","veilig_wachtwoord456","admin","BADGE002"',
      ]

      const csvContent = csvRows.join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", "gebruikers_template.csv")
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setImportMessage("✅ Template gedownload!")
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("❌ Error creating template:", error)
      setImportError("Fout bij maken van template")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Helper function to load badge codes for users
  const loadUserBadges = async () => {
    if (!supabase) {
      console.log("📋 No Supabase - returning empty badge map")
      return {}
    }

    try {
      console.log("📋 Loading user badges from database...")
      const { data, error } = await supabase.from("user_badges").select("*")

      if (error) {
        console.error("❌ Error loading badges:", error)
        return {}
      }

      console.log("📋 Raw badge data from database:", data)

      const badgeMap: Record<string, string> = {}
      data?.forEach((badge) => {
        if (badge.user_name && badge.badge_id) {
          badgeMap[badge.user_name] = badge.badge_id
          console.log(`📋 Mapped badge: ${badge.user_name} -> ${badge.badge_id}`)
        }
      })

      console.log("📋 Final badge map:", badgeMap)
      return badgeMap
    } catch (error) {
      console.error("❌ Exception loading badges:", error)
      return {}
    }
  }

  // Helper function to save badge code
  const saveBadgeCode = async (badgeCode: string, userEmail: string, userName: string) => {
    if (!supabase || !badgeCode.trim()) {
      console.log("💾 No badge to save or no supabase")
      return { success: true }
    }

    try {
      console.log("💾 Saving badge code:", { badgeCode, userEmail, userName })

      // First, delete any existing badge for this user
      const { error: deleteError } = await supabase.from("user_badges").delete().eq("user_name", userName)

      if (deleteError) {
        console.log("⚠️ Delete error (might be expected if no existing badge):", deleteError)
      }

      // Then insert the new badge
      const { error: insertError } = await supabase.from("user_badges").insert([
        {
          badge_id: badgeCode.trim(),
          user_email: userEmail,
          user_name: userName,
        },
      ])

      if (insertError) {
        console.error("❌ Error saving badge:", insertError)
        return { success: false, error: insertError }
      }

      console.log("✅ Badge saved successfully")
      return { success: true }
    } catch (error) {
      console.error("❌ Exception saving badge:", error)
      return { success: false, error }
    }
  }

  // Helper function to refresh users with badge codes
  const refreshUsersWithBadges = async () => {
    console.log("🔄 Refreshing users with badges...")

    const usersResult = await fetchUsers()
    if (usersResult.data) {
      console.log("👥 Fetched users:", usersResult.data)

      const badgeMap = await loadUserBadges()
      console.log("🏷️ Badge map:", badgeMap)

      const usersWithBadges = usersResult.data.map((user) => ({
        ...user,
        badgeCode: badgeMap[user.name] || "",
      }))

      console.log("👥 Users with badges:", usersWithBadges)
      setUsers(usersWithBadges)
    }
  }

  // Login function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loginEmail.trim()) {
      setLoginError("Voer je email adres in")
      return
    }

    if (!loginPassword) {
      setLoginError("Voer je wachtwoord in")
      return
    }

    setIsLoading(true)
    setLoginError("")

    try {
      console.log("🔐 Attempting login with email:", loginEmail)

      const result = await signIn(loginEmail.trim(), loginPassword)

      if (result.error) {
        console.error("🔐 Login error:", result.error)
        setLoginError(result.error.message || "Inloggen mislukt")
      } else if (result.data?.user) {
        console.log("✅ Login successful:", result.data.user.email)

        // Get user name from email or user metadata
        const userName = result.data.user.user_metadata?.name || result.data.user.email?.split("@")[0] || "Gebruiker"

        setLoggedInUser(userName)
        setCurrentUser(userName)
        setIsLoggedIn(true)

        // Reset login form
        setLoginEmail("")
        setLoginPassword("")
        setLoginError("")
      } else {
        setLoginError("Inloggen mislukt - geen gebruikersgegevens ontvangen")
      }
    } catch (error) {
      console.error("🔐 Login exception:", error)
      setLoginError("Er ging iets mis bij het inloggen")
    } finally {
      setIsLoading(false)
    }
  }

  // Badge login function
  const handleBadgeLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!badgeId.trim()) {
      setBadgeError("Voer je badge ID in")
      return
    }

    setIsLoading(true)
    setBadgeError("")
    setLoginError("") // Clear any existing login errors

    try {
      console.log("🏷️ Attempting badge login with ID:", badgeId)

      const result = await signInWithBadge(badgeId.trim())

      if (result.error) {
        console.error("🏷️ Badge login error:", result.error)
        setBadgeError(result.error.message || "Badge login mislukt")
      } else if (result.data?.user) {
        console.log("✅ Badge login successful:", result.data.user.email)

        // Get user name from email or user metadata
        const userName = result.data.user.user_metadata?.name || result.data.user.email?.split("@")[0] || "Gebruiker"

        setLoggedInUser(userName)
        setCurrentUser(userName)
        setIsLoggedIn(true)

        // Reset badge form
        setBadgeId("")
        setBadgeError("")
      } else {
        setBadgeError("Badge login mislukt - geen gebruikersgegevens ontvangen")
      }
    } catch (error) {
      console.error("🏷️ Badge login exception:", error)
      setBadgeError("Er ging iets mis bij het badge login")
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const handleLogout = () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
      setIsLoggedIn(false)
      setLoggedInUser("")
      setCurrentUser("")

      // Reset form data
      setSelectedProduct("")
      setProductSearchQuery("")
      setLocation("")
      setPurpose("")
      setQrScanResult("")

      console.log("👤 User logged out")
    }
  }

  // Check for existing session on app start
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          console.log("🔐 Found existing session:", user.email)
          setLoggedInUser(user.name)
          setCurrentUser(user.name)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.log("🔐 No existing session found")
      }
    }

    checkExistingSession()

    // Set up auth state listener
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      if (user) {
        console.log("🔐 Auth state changed - user logged in:", user.email)
        setLoggedInUser(user.name)
        setCurrentUser(user.name)
        setIsLoggedIn(true)
      } else {
        console.log("🔐 Auth state changed - user logged out")
        setIsLoggedIn(false)
        setLoggedInUser("")
        setCurrentUser("")
      }
    })

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  // FIXED: handleSubmit function with better error handling
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    console.log("🔄 Starting registration submission...")
    console.log("Form data:", { currentUser, selectedProduct, location, purpose })

    // Validation
    if (!currentUser || !selectedProduct || !location || !purpose) {
      console.error("❌ Missing required fields:", { currentUser, selectedProduct, location, purpose })
      setImportError("Vul alle velden in")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    setIsLoading(true)
    setImportError("")
    setImportMessage("")

    try {
      const now = new Date()
      const timestamp = now.toISOString()
      const date = now.toISOString().split("T")[0]
      const time = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })

      // Find the selected product to get QR code
      const selectedProductObj = products.find((p) => p.name === selectedProduct)

      const registrationData = {
        user_name: currentUser,
        product_name: selectedProduct,
        location: location,
        purpose: purpose,
        timestamp: timestamp,
        date: date,
        time: time,
        qr_code: selectedProductObj?.qrcode || qrScanResult || null,
      }

      console.log("📝 Registration data to save:", registrationData)

      const result = await saveRegistration(registrationData)

      if (result.error) {
        console.error("❌ Error saving registration:", result.error)
        setImportError(`Fout bij opslaan: ${result.error.message || "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      } else {
        console.log("✅ Registration saved successfully")

        // Refresh registrations list
        const refreshResult = await fetchRegistrations()
        if (refreshResult.data) {
          setRegistrations(refreshResult.data)
        }

        // Show success message
        setImportMessage("✅ Product succesvol geregistreerd!")
        setTimeout(() => setImportMessage(""), 3000)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)

        // Reset form
        setSelectedProduct("")
        setProductSearchQuery("")
        setLocation("")
        setPurpose("")
        setQrScanResult("")
      }
    } catch (error) {
      console.error("❌ Exception in handleSubmit:", error)
      setImportError(`Onverwachte fout: ${error}`)
      setTimeout(() => setImportError(""), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const startQrScanner = () => {
    setShowQrScanner(true)
  }

  const stopQrScanner = () => {
    setShowQrScanner(false)
  }

  const handleQrCodeDetected = (code: string) => {
    console.log("📱 QR Code detected:", code)
    setQrScanResult(code)
    stopQrScanner()

    if (qrScanMode === "registration") {
      // Find product by QR code
      const foundProduct = products.find((p) => p.qrcode === code)
      if (foundProduct) {
        setSelectedProduct(foundProduct.name)
        setProductSearchQuery(foundProduct.name)

        // FIXED: Automatically select the product's category
        if (foundProduct.categoryId) {
          setSelectedCategory(foundProduct.categoryId)
          console.log("🗂️ Auto-selected category:", foundProduct.categoryId)
        }

        setImportMessage(`✅ Product gevonden: ${foundProduct.name}`)
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setProductSearchQuery(code)
        setImportError(`❌ Geen product gevonden voor QR code: ${code}`)
        setTimeout(() => setImportError(""), 3000)
      }
    } else if (qrScanMode === "product-management") {
      setNewProductQrCode(code)
    }
  }

  const getFilteredProducts = () => {
    let filtered = products

    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.categoryId === selectedCategory)
    }

    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.qrcode && product.qrcode.toLowerCase().includes(query)),
      )
    }

    return filtered
  }

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.name)
    setProductSearchQuery(product.name)
    setQrScanResult(product.qrcode || "")
    setShowProductDropdown(false)
  }

  // EDIT HANDLERS - FIXED VERSIONS
  const handleEditUser = (userName: string) => {
    console.log("🔧 Starting user edit:", userName)
    const user = users.find((u) => u.name === userName)
    setEditingUser(userName)
    setEditingUserRole(user?.role || "user")
    setEditingUserBadgeCode(user?.badgeCode || "")
    setOriginalUser(userName)
    setOriginalUserRole(user?.role || "user")
    setOriginalUserBadgeCode(user?.badgeCode || "")
    setShowEditUserDialog(true)
  }

  const handleEditProduct = (product: Product) => {
    console.log("🔧 Starting product edit:", product)
    setEditingProduct({ ...product })
    setOriginalProduct({ ...product })
    setShowEditProductDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    console.log("🔧 Starting category edit:", category)
    setEditingCategory({ ...category })
    setOriginalCategory({ ...category })
    setShowEditCategoryDialog(true)
  }

  const handleEditLocation = (location: string) => {
    console.log("🔧 Starting location edit:", location)
    setEditingLocation(location)
    setOriginalLocation(location)
    setShowEditLocationDialog(true)
  }

  const handleEditPurpose = (purpose: string) => {
    console.log("🔧 Starting purpose edit:", purpose)
    setEditingPurpose(purpose)
    setOriginalPurpose(purpose)
    setShowEditPurposeDialog(true)
  }

  // SAVE HANDLERS - FIXED VERSIONS
  const handleSaveUser = async () => {
    if (!editingUser.trim()) {
      setImportError("Gebruikersnaam is verplicht")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    const hasChanges =
      editingUser.trim() !== originalUser ||
      editingUserRole !== originalUserRole ||
      editingUserBadgeCode.trim() !== originalUserBadgeCode

    if (!hasChanges) {
      setShowEditUserDialog(false)
      return
    }

    setIsLoading(true)

    try {
      console.log("💾 Saving user changes:", {
        originalUser,
        editingUser: editingUser.trim(),
        editingUserRole,
        editingUserBadgeCode: editingUserBadgeCode.trim(),
        originalUserBadgeCode,
      })

      // Update user in users table
      const result = await updateUser(originalUser, editingUser.trim(), editingUserRole)

      if (result.error) {
        setImportError("Fout bij opslaan gebruiker")
        setTimeout(() => setImportError(""), 3000)
        setIsLoading(false)
        return
      }

      // Handle badge code update
      if (editingUserBadgeCode.trim() !== originalUserBadgeCode) {
        const userEmail = `${editingUser.trim().toLowerCase().replace(/\s+/g, ".")}@dematic.com`

        if (editingUserBadgeCode.trim()) {
          // Save new badge
          const badgeResult = await saveBadgeCode(editingUserBadgeCode.trim(), userEmail, editingUser.trim())

          if (!badgeResult.success) {
            setImportError("Gebruiker opgeslagen maar badge kon niet worden opgeslagen")
            setTimeout(() => setImportError(""), 5000)
          } else {
            setImportMessage("✅ Gebruiker en badge succesvol aangepast!")
            setTimeout(() => setImportMessage(""), 3000)
          }
        } else {
          // Remove badge if empty
          if (supabase) {
            try {
              await supabase.from("user_badges").delete().eq("user_name", originalUser)
              console.log("🗑️ Badge removed for user:", originalUser)
              setImportMessage("✅ Gebruiker aangepast en badge verwijderd!")
              setTimeout(() => setImportMessage(""), 3000)
            } catch (err) {
              console.error("Error removing badge:", err)
            }
          }
        }
      } else {
        setImportMessage("✅ Gebruiker succesvol aangepast!")
        setTimeout(() => setImportMessage(""), 3000)
      }

      // Refresh users list with badge codes
      await refreshUsersWithBadges()
      setShowEditUserDialog(false)
    } catch (error) {
      console.error("❌ Exception in handleSaveUser:", error)
      setImportError("Er ging iets mis bij het opslaan")
      setTimeout(() => setImportError(""), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProduct = async () => {
    if (editingProduct && originalProduct) {
      const updateData = {
        name: editingProduct.name,
        qr_code: editingProduct.qrcode || null,
        category_id: editingProduct.categoryId ? Number.parseInt(editingProduct.categoryId) : null,
        attachment_url: editingProduct.attachmentUrl || null,
        attachment_name: editingProduct.attachmentName || null,
      }

      const result = await updateProduct(originalProduct.id, updateData)
      if (result.error) {
        setImportError("Fout bij opslaan product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
        setImportMessage("✅ Product aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditProductDialog(false)
    }
  }

  const handleSaveCategory = async () => {
    if (editingCategory && originalCategory) {
      const result = await updateCategory(originalCategory.id, { name: editingCategory.name })
      if (result.error) {
        setImportError("Fout bij opslaan categorie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchCategories()
        if (refreshResult.data) {
          setCategories(refreshResult.data)
        }
        setImportMessage("✅ Categorie aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditCategoryDialog(false)
    }
  }

  const handleSaveLocation = async () => {
    if (editingLocation.trim() && editingLocation.trim() !== originalLocation) {
      const result = await updateLocation(originalLocation, editingLocation.trim())
      if (result.error) {
        setImportError("Fout bij opslaan locatie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchLocations()
        if (refreshResult.data) {
          setLocations(refreshResult.data)
        }
        setImportMessage("✅ Locatie aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditLocationDialog(false)
    }
  }

  const handleSavePurpose = async () => {
    if (editingPurpose.trim() && editingPurpose.trim() !== originalPurpose) {
      const result = await updatePurpose(originalPurpose, editingPurpose.trim())
      if (result.error) {
        setImportError("Fout bij opslaan doel")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchPurposes()
        if (refreshResult.data) {
          setPurposes(refreshResult.data)
        }
        setImportMessage("✅ Doel aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditPurposeDialog(false)
    }
  }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event: any) => {
      const text = event.target.result
      const lines = text.split("\n")
      const header = lines[0].split(",")

      if (header.length < 1) {
        setImportError("Ongeldig CSV formaat: kolom A: Productnaam, kolom B: Categorie")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      const newProducts: Product[] = []

      for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(",")
        if (data.length < 1) continue

        const productName = data[0]?.trim()
        const categoryName = data[1]?.trim()

        if (!productName) continue

        let categoryId: string | undefined = undefined
        if (categoryName) {
          const existingCategory = categories.find((c) => c.name === categoryName)
          if (existingCategory) {
            categoryId = existingCategory.id
          } else {
            const newCategoryResult = await saveCategory({ name: categoryName })
            if (newCategoryResult.data) {
              categoryId = newCategoryResult.data.id
              const refreshResult = await fetchCategories()
              if (refreshResult.data) {
                setCategories(refreshResult.data)
              }
            }
          }
        }

        const existingProduct = products.find((p) => p.name === productName)
        if (!existingProduct) {
          const newProduct: Product = {
            id: Date.now().toString(),
            name: productName,
            categoryId: categoryId,
            created_at: new Date().toISOString(),
          }
          newProducts.push(newProduct)
          await saveProduct(newProduct)
        }
      }

      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }

      setImportMessage(`✅ ${newProducts.length} producten geïmporteerd!`)
      setTimeout(() => setImportMessage(""), 3000)
    }

    reader.onerror = () => {
      setImportError("Fout bij lezen van bestand")
      setTimeout(() => setImportError(""), 3000)
    }

    reader.readAsText(file)
  }

  const handleExportExcel = () => {
    const csvRows = []
    const header = ["Productnaam", "Categorie"]
    csvRows.push(header.join(","))

    for (const product of products) {
      const categoryName = product.categoryId ? categories.find((c) => c.id === product.categoryId)?.name : ""
      const values = [product.name, categoryName]
      csvRows.push(values.join(","))
    }

    const csvString = csvRows.join("\n")

    const blob = new Blob([csvString], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("href", url)
    a.setAttribute("download", "producten.csv")
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const printAllQRCodes = async () => {
    const productsWithQRCodes = products.filter((p) => p.qrcode)

    if (productsWithQRCodes.length === 0) {
      alert("Geen producten met QR codes gevonden")
      return
    }

    setImportMessage("📱 Bezig met genereren van alle QR codes...")

    try {
      // Create a canvas for each product and download them
      for (let i = 0; i < productsWithQRCodes.length; i++) {
        const product = productsWithQRCodes[i]

        // Create canvas for this product
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        // Set canvas size for A4-like proportions
        canvas.width = 600
        canvas.height = 800

        if (ctx) {
          // White background
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Title
          ctx.fillStyle = "black"
          ctx.font = "bold 24px Arial"
          ctx.textAlign = "center"
          ctx.fillText("QR Code", canvas.width / 2, 60)

          // Product name (with text wrapping)
          ctx.font = "18px Arial"
          const maxWidth = canvas.width - 40
          const words = product.name.split(" ")
          let line = ""
          let y = 120

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " "
            const metrics = ctx.measureText(testLine)
            const testWidth = metrics.width

            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, canvas.width / 2, y)
              line = words[n] + " "
              y += 25
            } else {
              line = testLine
            }
          }
          ctx.fillText(line, canvas.width / 2, y)

          // Create QR code image
          const qrImg = new Image()
          qrImg.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            qrImg.onload = () => {
              // Draw QR code
              const qrSize = 300
              const qrX = (canvas.width - qrSize) / 2
              const qrY = y + 40

              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

              // QR Code text
              ctx.font = "14px Arial"
              ctx.fillText(`QR Code: ${product.qrcode}`, canvas.width / 2, qrY + qrSize + 30)

              // Date
              const now = new Date()
              ctx.font = "12px Arial"
              ctx.fillText(now.toLocaleDateString("nl-NL"), canvas.width / 2, qrY + qrSize + 60)

              // Convert to PNG and download
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `QR_${product.name.replace(/[^a-zA-Z0-9]/g, "_")}_${i + 1}.png`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }
                resolve(true)
              }, "image/png")
            }

            qrImg.onerror = () => {
              // Fallback: create simple text-based version
              ctx.font = "16px Arial"
              ctx.fillText("QR Code kon niet worden geladen", canvas.width / 2, y + 100)
              ctx.fillText(`Code: ${product.qrcode}`, canvas.width / 2, y + 130)

              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `QR_${product.name.replace(/[^a-zA-Z0-9]/g, "_")}_${i + 1}.png`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }
                resolve(true)
              }, "image/png")
            }

            // Load QR code image
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(product.qrcode)}`
          })

          // Small delay between downloads to prevent overwhelming the browser
          if (i < productsWithQRCodes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      }

      setImportMessage(`✅ ${productsWithQRCodes.length} QR codes gedownload!`)
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("Error generating QR codes:", error)
      setImportError("Fout bij genereren van QR codes")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  const printQRCode = (product: Product) => {
    if (!product.qrcode) {
      alert("Geen QR code gevonden voor dit product")
      return
    }

    // FIXED: Create PDF blob and download directly instead of opening in browser
    const createPDF = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // Set canvas size for A4-like proportions
      canvas.width = 600
      canvas.height = 800

      if (ctx) {
        // White background
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Title
        ctx.fillStyle = "black"
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "center"
        ctx.fillText("QR Code", canvas.width / 2, 60)

        // Product name
        ctx.font = "18px Arial"
        const maxWidth = canvas.width - 40
        const words = product.name.split(" ")
        let line = ""
        let y = 120

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " "
          const metrics = ctx.measureText(testLine)
          const testWidth = metrics.width

          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, canvas.width / 2, y)
            line = words[n] + " "
            y += 25
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, canvas.width / 2, y)

        // QR Code (create QR code image)
        const qrImg = new Image()
        qrImg.crossOrigin = "anonymous"
        qrImg.onload = () => {
          // Draw QR code
          const qrSize = 300
          const qrX = (canvas.width - qrSize) / 2
          const qrY = y + 40

          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

          // QR Code text
          ctx.font = "14px Arial"
          ctx.fillText(`QR Code: ${product.qrcode}`, canvas.width / 2, qrY + qrSize + 30)

          // Date
          const now = new Date()
          ctx.font = "12px Arial"
          ctx.fillText(now.toLocaleDateString("nl-NL"), canvas.width / 2, qrY + qrSize + 60)

          // Convert to PDF and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `QR_${product.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }
          }, "image/png")
        }

        qrImg.onerror = () => {
          // Fallback: create simple text-based version
          ctx.font = "16px Arial"
          ctx.fillText("QR Code kon niet worden geladen", canvas.width / 2, y + 100)
          ctx.fillText(`Code: ${product.qrcode}`, canvas.width / 2, y + 130)

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `QR_${product.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }
          }, "image/png")
        }

        // Load QR code image
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(product.qrcode)}`
      }
    }

    createPDF()
  }

  const generateQRCode = async (product: Product) => {
    try {
      // Generate long format QR code like the old ones
      const productPrefix = product.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10)

      const randomNumber = Math.floor(100000 + Math.random() * 900000)
      const qrCodeValue = `${productPrefix}_${randomNumber}`

      // Update the product in Supabase with the new QR code
      const { error } = await supabase.from("products").update({ qr_code: qrCodeValue }).eq("id", product.id)

      if (error) {
        console.error("Error updating QR code in Supabase:", error)
        throw error
      }

      // FIXED: Update local state immediately to show QR code without refresh
      setProducts(products.map((p) => (p.id === product.id ? { ...p, qrcode: qrCodeValue } : p)))

      toast({
        title: "QR Code Gegenereerd",
        description: `QR code ${qrCodeValue} is aangemaakt en opgeslagen.`,
      })
    } catch (error) {
      console.error("Error generating QR code:", error)
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het genereren van de QR code.",
        variant: "destructive",
      })
    }
  }

  const exportQRCodesForLabelPrinter = async () => {
    const productsWithQRCodes = products.filter((p) => p.qrcode)

    if (productsWithQRCodes.length === 0) {
      alert("Geen producten met QR codes gevonden")
      return
    }

    setImportMessage("🏷️ Bezig met maken van labelprinter bestanden...")

    try {
      // 1. Create main CSV file for label data
      const csvRows = []
      csvRows.push("ProductNaam,QRCode,LabelBreedte,LabelHoogte,QRGrootte")

      productsWithQRCodes.forEach((product) => {
        // Format: Product name, QR code, label dimensions optimized for ATP-300 Pro
        csvRows.push(`"${product.name}","${product.qrcode}","50","30","20"`)
      })

      const csvContent = csvRows.join("\n")
      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

      // 2. Create instruction file for ATP-300 Pro
      const instructionContent = `LABELPRINTER INSTRUCTIES - ATP-300 Pro van Altec
=================================================

BESTAND: qr_labels_data.csv
DATUM: ${new Date().toLocaleDateString("nl-NL")}
AANTAL LABELS: ${productsWithQRCodes.length}

PRINTER INSTELLINGEN ATP-300 Pro:
---------------------------------
• Label formaat: 50mm x 30mm
• QR code grootte: 20mm x 20mm
• Print snelheid: Medium (150mm/s)
• Print temperatuur: 200°C
• Label type: Thermisch transfer
• Ribbon type: Wax/Resin

STAPPEN VOOR ATP-300 PRO:
-------------------------
1. Installeer Altec LabelMark software
2. Open LabelMark en maak nieuwe template:
   - Label grootte: 50mm x 30mm
   - Voeg QR code object toe (20mm x 20mm)
   - Voeg tekst object toe voor productnaam
3. Importeer CSV bestand via "Data Import"
4. Koppel velden:
   - ProductNaam → Tekst object
   - QRCode → QR code object
5. Test print 1 label
6. Start batch print voor alle ${productsWithQRCodes.length} labels

ANDERE PRINTERS:
---------------
• Brother QL-serie: Gebruik Brother P-touch Editor
• Zebra ZD-serie: Gebruik ZebraDesigner
• DYMO LabelWriter: Gebruik DYMO Connect

CSV FORMAAT:
-----------
Kolom 1: ProductNaam (tekst voor op label)
Kolom 2: QRCode (data voor QR code)
Kolom 3: LabelBreedte (50mm)
Kolom 4: LabelHoogte (30mm)
Kolom 5: QRGrootte (20mm)

TROUBLESHOOTING:
---------------
• QR codes niet leesbaar: Vergroot QRGrootte naar 25mm
• Tekst te klein: Gebruik font grootte 8-10pt
• Labels scheef: Controleer label uitlijning in printer
• Print kwaliteit slecht: Verhoog print temperatuur

SUPPORT:
--------
Voor technische ondersteuning ATP-300 Pro:
• Altec Support: +31 (0)73 599 5555
• Email: support@altec.nl
• Manual: www.altec.nl/downloads

DEMATIC CONTACT:
---------------
Voor vragen over dit systeem:
• IT Support: it-support@dematic.com
• Systeembeheer: ${loggedInUser}

=================================================
Gegenereerd door Dematic Product Registratie App
${new Date().toLocaleString("nl-NL")}
`

      const instructionBlob = new Blob([instructionContent], { type: "text/plain;charset=utf-8;" })

      // 3. Create ZPL template for Zebra printers
      const zplTemplate = `^XA
^FO50,50^GFA,1024,1024,16,${Array(64).fill("0").join("")}^FS
^FO50,200^A0N,30,30^FD{ProductNaam}^FS
^FO300,50^BQN,2,8^FDQA,{QRCode}^FS
^XZ`

      const zplBlob = new Blob([zplTemplate], { type: "text/plain;charset=utf-8;" })

      // 4. Download all files
      const files = [
        { blob: csvBlob, name: "qr_labels_data.csv" },
        { blob: instructionBlob, name: "INSTRUCTIES_ATP300_Pro.txt" },
        { blob: zplBlob, name: "zebra_template.zpl" },
      ]

      for (const file of files) {
        const url = URL.createObjectURL(file.blob)
        const a = document.createElement("a")
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setImportMessage(`✅ Labelprinter bestanden gedownload! (${productsWithQRCodes.length} labels)`)
      setTimeout(() => setImportMessage(""), 5000)
    } catch (error) {
      console.error("❌ Error creating label printer files:", error)
      setImportError("Fout bij maken van labelprinter bestanden")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  const handleAttachmentUpload = async (product: Product, e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)

    try {
      const result = await uploadPDFToStorage(file, product.id)

      if (result.error) {
        setImportError("Fout bij uploaden bestand")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const updateData = {
          name: product.name,
          qr_code: product.qrcode || null,
          category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
          attachment_url: result.url,
          attachment_name: file.name,
        }

        const updateResult = await updateProduct(product.id, updateData)

        if (updateResult.error) {
          setImportError("Fout bij opslaan product")
          setTimeout(() => setImportError(""), 3000)
        } else {
          const refreshResult = await fetchProducts()
          if (refreshResult.data) {
            setProducts(refreshResult.data)
          }
          setImportMessage("✅ Bestand geupload!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAttachment = async (product: Product) => {
    setIsLoading(true)

    try {
      if (!product.attachmentUrl) return

      const result = await deletePDFFromStorage(product.attachmentUrl)

      if (result.error) {
        setImportError("Fout bij verwijderen bestand")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const updateData = {
          name: product.name,
          qr_code: product.qrcode || null,
          category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
          attachment_url: null,
          attachment_name: null,
        }

        const updateResult = await updateProduct(product.id, updateData)

        if (updateResult.error) {
          setImportError("Fout bij opslaan product")
          setTimeout(() => setImportError(""), 3000)
        } else {
          const refreshResult = await fetchProducts()
          if (refreshResult.data) {
            setProducts(refreshResult.data)
          }
          setImportMessage("✅ Bestand verwijderd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    console.log("🚀 Starting app initialization...")
    loadAllData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSelectorRef.current && !productSelectorRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const loadAllData = async () => {
    console.log("🔄 Loading all data...")
    setConnectionStatus("Verbinden met database...")

    try {
      const supabaseConfigured = isSupabaseConfigured()
      console.log("🔧 Supabase configured:", supabaseConfigured)

      if (supabaseConfigured) {
        console.log("🔄 Testing Supabase connection...")

        const connectionTest = await testSupabaseConnection()

        if (connectionTest) {
          console.log("🔄 Loading from Supabase...")
          const [usersResult, productsResult, locationsResult, purposesResult, categoriesResult, registrationsResult] =
            await Promise.all([
              fetchUsers(),
              fetchProducts(),
              fetchLocations(),
              fetchPurposes(),
              fetchCategories(),
              fetchRegistrations(),
            ])

          console.log("📊 Supabase results:", {
            users: { success: !usersResult.error, count: usersResult.data?.length || 0 },
            products: { success: !productsResult.error, count: productsResult.data?.length || 0 },
            locations: { success: !locationsResult.error, count: locationsResult.data?.length || 0 },
            purposes: { success: !purposesResult.error, count: purposesResult.data?.length || 0 },
            categories: { success: !categoriesResult.error, count: categoriesResult.data?.length || 0 },
          })

          const hasErrors = usersResult.error || productsResult.error || categoriesResult.error

          if (!hasErrors) {
            console.log("✅ Supabase connected successfully")
            setIsSupabaseConnected(true)
            setConnectionStatus("Supabase verbonden")

            // Load users with badge codes
            const badgeMap = await loadUserBadges()
            const usersWithBadges = (usersResult.data || []).map((user) => ({
              ...user,
              badgeCode: badgeMap[user.name] || "",
            }))

            console.log("👥 Setting users with badges:", usersWithBadges)
            setUsers(usersWithBadges)
            setProducts(productsResult.data || [])
            setLocations(locationsResult.data || [])
            setPurposes(purposesResult.data || [])
            setCategories(categoriesResult.data || [])
            setRegistrations(registrationsResult.data || [])

            setupSubscriptions()
          } else {
            console.log("️ Supabase data fetch failed - using mock data")
            setIsSupabaseConnected(false)
            setConnectionStatus("Mock data actief (data fetch failed)")
            loadMockData()
          }
        } else {
          console.log("⚠️ Supabase connection test failed - using mock data")
          setIsSupabaseConnected(false)
          setConnectionStatus("Mock data actief (connection failed)")
          loadMockData()
        }
      } else {
        console.log("⚠️ Supabase not configured - using mock data")
        setIsSupabaseConnected(false)
        setConnectionStatus("Mock data actief (not configured)")
        loadMockData()
      }

      console.log("🎯 App initialization complete - setting ready state")
      setIsReady(true)
    } catch (error) {
      console.error("❌ Error loading data:", error)
      setError(`Fout bij laden: ${error}`)
      setIsSupabaseConnected(false)
      setConnectionStatus("Mock data actief (error)")
      loadMockData()
      setIsReady(true)
    }
  }

  const loadMockData = () => {
    console.log("📱 Loading mock data...")
    const mockUsers = [
      { name: "Tom Peckstadt", role: "admin", badgeCode: "BADGE001" },
      { name: "Sven De Poorter", role: "user", badgeCode: "" },
      { name: "Nele Herteleer", role: "user", badgeCode: "BADGE003" },
      { name: "Wim Peckstadt", role: "admin", badgeCode: "" },
      { name: "Siegfried Weverbergh", role: "user", badgeCode: "BADGE005" },
      { name: "Jan Janssen", role: "user", badgeCode: "" },
    ]
    const mockProducts = [
      { id: "1", name: "Interflon Metal Clean spray 500ml", qrcode: "IFLS001", categoryId: "1" },
      { id: "2", name: "Interflon Grease LT2 Lube shuttle 400gr", qrcode: "IFFL002", categoryId: "1" },
      { id: "3", name: "Interflon Maintenance Kit", qrcode: "IFD003", categoryId: "2" },
      { id: "4", name: "Interflon Food Lube spray 500ml", qrcode: "IFGR004", categoryId: "1" },
      { id: "5", name: "Interflon Foam Cleaner spray 500ml", qrcode: "IFMC005", categoryId: "2" },
      { id: "6", name: "Interflon Fin Super", qrcode: "IFMK006", categoryId: "3" },
    ]
    const mockLocations = [
      "Warehouse Dematic groot boven",
      "Warehouse Interflon",
      "Warehouse Dematic klein beneden",
      "Onderhoud werkplaats",
      "Kantoor 1.1",
    ]
    const mockPurposes = ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie"]
    const mockCategories = [
      { id: "1", name: "Smeermiddelen" },
      { id: "2", name: "Reinigers" },
      { id: "3", name: "Onderhoud" },
    ]

    const mockRegistrations = [
      {
        id: "1",
        user: "Tom Peckstadt",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Interflon",
        purpose: "Reparatie",
        timestamp: "2025-06-15T05:41:00Z",
        date: "2025-06-15",
        time: "05:41",
        qrcode: "IFLS001",
      },
      {
        id: "2",
        user: "Nele Herteleer",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Dematic klein beneden",
        purpose: "Training",
        timestamp: "2025-06-15T05:48:00Z",
        date: "2025-06-15",
        time: "05:48",
        qrcode: "IFLS001",
      },
    ]

    setUsers(mockUsers)
    setProducts(mockProducts)
    setLocations(mockLocations)
    setPurposes(mockPurposes)
    setCategories(mockCategories)
    setRegistrations(mockRegistrations)
  }

  const setupSubscriptions = () => {
    console.log("🔔 Setting up real-time subscriptions...")

    const usersSub = subscribeToUsers(async (newUsers) => {
      console.log("🔔 Users updated via subscription:", newUsers.length)
      // Reload users with badge codes when users change
      await refreshUsersWithBadges()
    })

    const productsSub = subscribeToProducts((newProducts) => {
      console.log("🔔 Products updated via subscription:", newProducts.length)
      setProducts(newProducts)
    })

    const locationsSub = subscribeToLocations((newLocations) => {
      console.log("🔔 Locations updated via subscription:", newLocations.length)
      setLocations(newLocations)
    })

    const purposesSub = subscribeToPurposes((newPurposes) => {
      console.log("🔔 Purposes updated via subscription:", newPurposes.length)
      setPurposes(newPurposes)
    })

    const categoriesSub = subscribeToCategories((newCategories) => {
      console.log("🔔 Categories updated via subscription:", newCategories.length)
      setCategories(newCategories)
    })

    const registrationsSub = subscribeToRegistrations((newRegistrations) => {
      console.log("🔔 Registrations updated via subscription:", newRegistrations.length)
      setRegistrations(newRegistrations)
    })

    return () => {
      usersSub?.unsubscribe?.()
      productsSub?.unsubscribe?.()
      locationsSub?.unsubscribe?.()
      purposesSub?.unsubscribe?.()
      categoriesSub?.unsubscribe?.()
      registrationsSub?.unsubscribe?.()
    }
  }

  // Add functions
  const addNewUser = async () => {
    if (newUserName.trim() && !users.find((user) => user.name === newUserName.trim())) {
      const userName = newUserName.trim()
      const result = await saveUser(userName)
      if (result.error) {
        setImportError("Fout bij opslaan gebruiker")
        setTimeout(() => setImportError(""), 3000)
      } else {
        await refreshUsersWithBadges()
        setImportMessage("✅ Gebruiker toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewUserName("")
    }
  }

  const addNewUserWithAuth = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setImportError("Vul alle velden in")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    if (newUserPassword.length < 6) {
      setImportError("Wachtwoord moet minimaal 6 tekens lang zijn")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    setIsLoading(true)

    try {
      setImportMessage("👤 Bezig met aanmaken gebruiker en inlog-account...")

      const result = await createAuthUser(newUserEmail.trim(), newUserPassword, newUserName.trim(), newUserLevel)

      if (result.error) {
        console.error("Error creating auth user:", result.error)
        setImportError(`Fout bij aanmaken: ${result.error.message || "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      } else {
        // Save badge code if provided
        if (newUserBadgeCode.trim()) {
          const badgeResult = await saveBadgeCode(newUserBadgeCode.trim(), newUserEmail.trim(), newUserName.trim())

          if (!badgeResult.success) {
            setImportError("Gebruiker aangemaakt maar badge kon niet worden opgeslagen")
            setTimeout(() => setImportError(""), 5000)
          } else {
            setImportMessage("✅ Gebruiker, inlog-account en badge succesvol aangemaakt!")
            setTimeout(() => setImportMessage(""), 3000)
          }
        } else {
          setImportMessage("✅ Gebruiker en inlog-account succesvol aangemaakt!")
          setTimeout(() => setImportMessage(""), 3000)
        }

        setNewUserName("")
        setNewUserEmail("")
        setNewUserPassword("")
        setNewUserBadgeCode("")

        await refreshUsersWithBadges()
      }
    } catch (error) {
      console.error("Exception creating auth user:", error)
      setImportError("Er ging iets mis bij het aanmaken van de gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewProduct = async () => {
    if (newProductName.trim()) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newProductName.trim(),
        qrcode: newProductQrCode.trim() || undefined,
        categoryId: newProductCategory === "none" ? undefined : newProductCategory,
        created_at: new Date().toISOString(),
      }

      const result = await saveProduct(newProduct)
      if (result.error) {
        setImportError("Fout bij opslaan product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
        setImportMessage("✅ Product toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }

      setNewProductName("")
      setNewProductQrCode("")
      setNewProductCategory("none")
    }
  }

  const addNewLocation = async () => {
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      const locationName = newLocationName.trim()
      const result = await saveLocation(locationName)
      if (result.error) {
        setImportError("Fout bij opslaan locatie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchLocations()
        if (refreshResult.data) {
          setLocations(refreshResult.data)
        }
        setImportMessage("✅ Locatie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewLocationName("")
    }
  }

  const addNewPurpose = async () => {
    if (newPurposeName.trim() && !purposes.includes(newPurposeName.trim())) {
      const purposeName = newPurposeName.trim()
      const result = await savePurpose(purposeName)
      if (result.error) {
        setImportError("Fout bij opslaan doel")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchPurposes()
        if (refreshResult.data) {
          setPurposes(refreshResult.data)
        }
        setImportMessage("✅ Doel toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewPurposeName("")
    }
  }

  const addNewCategory = async () => {
    if (newCategoryName.trim() && !categories.find((c) => c.name === newCategoryName.trim())) {
      const categoryName = newCategoryName.trim()
      const result = await saveCategory({ name: categoryName })
      if (result.error) {
        setImportError("Fout bij opslaan categorie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchCategories()
        if (refreshResult.data) {
          setCategories(refreshResult.data)
        }
        setImportMessage("✅ Categorie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewCategoryName("")
    }
  }

  // Remove functions
  const removeUser = async (userToRemove: string) => {
    const result = await deleteUser(userToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } else {
      await refreshUsersWithBadges()
      setImportMessage("✅ Gebruiker verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeProduct = async (productToRemove: Product) => {
    const result = await deleteProduct(productToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen product")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }
      setImportMessage("✅ Product verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeLocation = async (locationToRemove: string) => {
    const result = await deleteLocation(locationToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen locatie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchLocations()
      if (refreshResult.data) {
        setLocations(refreshResult.data)
      }
      setImportMessage("✅ Locatie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removePurpose = async (purposeToRemove: string) => {
    const result = await deletePurpose(purposeToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen doel")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchPurposes()
      if (refreshResult.data) {
        setPurposes(refreshResult.data)
      }
      setImportMessage("✅ Doel verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeCategory = async (categoryToRemove: Category) => {
    const result = await deleteCategory(categoryToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen categorie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchCategories()
      if (refreshResult.data) {
        setCategories(refreshResult.data)
      }
      setImportMessage("✅ Categorie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  // Function to get filtered and sorted registrations
  const getFilteredAndSortedRegistrations = () => {
    const filtered = registrations.filter((registration) => {
      if (historySearchQuery) {
        const searchLower = historySearchQuery.toLowerCase()
        const matchesSearch =
          registration.user.toLowerCase().includes(searchLower) ||
          registration.product.toLowerCase().includes(searchLower) ||
          registration.location.toLowerCase().includes(searchLower) ||
          registration.purpose.toLowerCase().includes(searchLower) ||
          (registration.qrcode && registration.qrcode.toLowerCase().includes(searchLower))

        if (!matchesSearch) return false
      }

      if (selectedHistoryUser !== "all" && registration.user !== selectedHistoryUser) {
        return false
      }

      if (selectedHistoryLocation !== "all" && registration.location !== selectedHistoryLocation) {
        return false
      }

      const registrationDate = new Date(registration.timestamp).toISOString().split("T")[0]

      if (dateFrom && registrationDate < dateFrom) {
        return false
      }

      if (dateTo && registrationDate > dateTo) {
        return false
      }

      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case "user":
          comparison = a.user.localeCompare(b.user, "nl", { sensitivity: "base" })
          break
        case "product":
          comparison = a.product.localeCompare(b.product, "nl", { sensitivity: "base" })
          break
        case "location":
          comparison = a.location.localeCompare(b.location, "nl", { sensitivity: "base" })
          break
        default:
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      }

      return sortOrder === "newest" ? -comparison : comparison
    })

    return filtered
  }

  // Function to get filtered and sorted users
  const getFilteredAndSortedUsers = () => {
    return users
      .filter((user) => user.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }))
  }

  // Statistics functions
  const getTopUsers = () => {
    const userCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.user] = (acc[reg.user] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopProducts = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopLocations = () => {
    const locationCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.location] = (acc[reg.location] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getProductChartData = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"]

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, count], index) => ({
        product,
        count,
        color: colors[index % colors.length],
      }))
  }

  // Function to get current user's role
  const getCurrentUserRole = () => {
    // First try to find user in the users array
    const currentUserData = users.find((user) => user.name === loggedInUser)
    if (currentUserData?.role) {
      return currentUserData.role
    }

    // Fallback: check if this is a known admin user
    const knownAdmins = ["Tom Peckstadt", "Wim Peckstadt", "wipeckstadt"]
    if (knownAdmins.includes(loggedInUser)) {
      return "admin"
    }

    // Default to user if no role found
    return "user"
  }

  // Debug logging
  console.log("🔍 Current user role check:", {
    loggedInUser,
    usersArray: users,
    foundUser: users.find((user) => user.name === loggedInUser),
    calculatedRole: getCurrentUserRole(),
  })

  // CONDITIONAL RENDERING AFTER ALL HOOKS
  console.log("🎨 Rendering main app interface")

  // Show loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">App wordt geladen...</p>
          <p className="text-xs text-gray-500">{connectionStatus}</p>
        </div>
      </div>
    )
  }

  // Show error if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900">Er ging iets mis</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Opnieuw Proberen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-lg">
            <CardHeader className="text-center bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex justify-center mb-4">
                <div
                  className="flex items-center bg-white p-4 rounded-lg shadow-sm border"
                  style={{ minWidth: "200px", height: "80px", position: "relative" }}
                >
                  <div className="w-1 h-12 bg-amber-500 absolute left-4"></div>
                  <div
                    className="text-2xl font-bold text-gray-800 tracking-wide absolute"
                    style={{ bottom: "16px", left: "32px" }}
                  >
                    DEMATIC
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Product Registratie</CardTitle>
              <CardDescription>Log in met je email adres en wachtwoord</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email adres
                  </Label>
                  <Input
                    type="email"
                    placeholder="je.naam@dematic.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Wachtwoord
                  </Label>
                  <Input
                    type="password"
                    placeholder="Voer je wachtwoord in"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">🏷️ Badge Login</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Scan of voer badge ID in"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      className="h-12 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleBadgeLogin(e)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        // Focus the input field for external NFC readers
                        const badgeInput = document.querySelector(
                          'input[placeholder="Scan of voer badge ID in"]',
                        ) as HTMLInputElement
                        if (badgeInput) {
                          badgeInput.focus()
                        }
                      }}
                      className="h-12 px-4 bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      🏷️ Scan badge
                    </Button>
                  </div>
                  {badgeError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{badgeError}</div>
                  )}
                  <Button
                    type="button"
                    onClick={handleBadgeLogin}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    disabled={isLoading || !badgeId.trim()}
                  >
                    {isLoading ? "Bezig met badge login..." : "🏷️ Login met Badge"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Of</span>
                  </div>
                </div>

                {loginError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{loginError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-amber-600 hover:bg-amber-700"
                  disabled={isLoading || !loginEmail.trim() || !loginPassword}
                >
                  {isLoading ? "Bezig met inloggen..." : "🔐 Inloggen"}
                </Button>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div
                      className={`w-2 h-2 rounded-full ${isSupabaseConnected ? "bg-green-500" : "bg-orange-500"}`}
                    ></div>
                    <span>{connectionStatus}</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Product Registratie</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Ingelogd als: {loggedInUser}</span>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {importMessage && (
            <Alert className="mb-4">
              <AlertDescription>{importMessage}</AlertDescription>
            </Alert>
          )}

          {importError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="registration" className="space-y-4">
            <TabsList>
              <TabsTrigger value="registration">Registratie</TabsTrigger>
              <TabsTrigger value="history">Historie</TabsTrigger>
              <TabsTrigger value="products">Producten</TabsTrigger>
              {getCurrentUserRole() === "admin" && <TabsTrigger value="users">Gebruikers</TabsTrigger>}
              <TabsTrigger value="statistics">Statistieken</TabsTrigger>
            </TabsList>

            {/* Registration Tab */}
            <TabsContent value="registration" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Registratie</CardTitle>
                  <CardDescription>Registreer een product voor gebruik</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="user">Gebruiker</Label>
                      <Input
                        type="text"
                        id="user"
                        value={currentUser}
                        onChange={(e) => setCurrentUser(e.target.value)}
                        placeholder="Selecteer gebruiker"
                        disabled
                      />
                    </div>

                    {/* Product Selection */}
                    <div className="space-y-2" ref={productSelectorRef}>
                      <Label htmlFor="product">Product</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          id="product"
                          placeholder="Zoek product..."
                          value={productSearchQuery}
                          onChange={(e) => {
                            setSelectedProduct("")
                            setProductSearchQuery(e.target.value)
                            setShowProductDropdown(true)
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                          onClick={() => {
                            setQrScanMode("registration")
                            startQrScanner()
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>

                        {showProductDropdown && (
                          <div className="absolute left-0 mt-1 w-full z-10 bg-white border rounded-md shadow-md">
                            <div className="p-2">
                              <Input
                                type="text"
                                placeholder="Filter producten..."
                                value={productSearchFilter}
                                onChange={(e) => setProductSearchFilter(e.target.value)}
                                className="mb-2"
                              />
                              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecteer categorie" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Alle categorieën</SelectItem>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="max-h-60 overflow-y-auto">
                              {getFilteredProducts()
                                .filter((product) =>
                                  productSearchFilter
                                    ? product.name.toLowerCase().includes(productSearchFilter.toLowerCase())
                                    : true,
                                )
                                .map((product) => (
                                  <Button
                                    key={product.id}
                                    variant="ghost"
                                    className="w-full justify-start px-4 py-2 hover:bg-gray-100"
                                    onClick={() => handleProductSelect(product)}
                                  >
                                    {product.name}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="location">Locatie</Label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecteer een locatie" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Purpose Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="purpose">Doel</Label>
                      <Select value={purpose} onValueChange={setPurpose}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecteer een doel" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purpose) => (
                            <SelectItem key={purpose} value={purpose}>
                              {purpose}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Bezig met registreren..." : "Registreer"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* QR Scanner Dialog */}
              <Dialog open={showQrScanner} onOpenChange={setShowQrScanner}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                    <DialogDescription>Plaats de QR code in het frame om te scannen.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center">
                    <QrScannerComponent onResult={handleQrCodeDetected} />
                    <Button type="button" variant="secondary" onClick={stopQrScanner} className="mt-4">
                      Annuleren
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registratie Historie</CardTitle>
                  <CardDescription>Bekijk de historie van product registraties</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Search */}
                    <Input
                      type="text"
                      placeholder="Zoek in historie..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                    />

                    {/* User Filter */}
                    <Select value={selectedHistoryUser} onValueChange={setSelectedHistoryUser}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter op gebruiker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle gebruikers</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.name} value={user.name}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Location Filter */}
                    <Select value={selectedHistoryLocation} onValueChange={setSelectedHistoryLocation}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter op locatie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle locaties</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Date From */}
                    <div>
                      <Label htmlFor="dateFrom">Van datum</Label>
                      <Input
                        type="date"
                        id="dateFrom"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <Label htmlFor="dateTo">Tot datum</Label>
                      <Input
                        type="date"
                        id="dateTo"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Sort By */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sorteer op" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Datum</SelectItem>
                        <SelectItem value="user">Gebruiker</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="location">Locatie</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Order */}
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sorteer volgorde" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nieuwste eerst</SelectItem>
                        <SelectItem value="oldest">Oudste eerst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* History Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Locatie</TableHead>
                        <TableHead>Doel</TableHead>
                        <TableHead>QR Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedRegistrations().map((registration) => (
                        <TableRow key={registration.id}>
                          <TableCell>
                            {registration.date} {registration.time}
                          </TableCell>
                          <TableCell>{registration.user}</TableCell>
                          <TableCell>{registration.product}</TableCell>
                          <TableCell>{registration.location}</TableCell>
                          <TableCell>{registration.purpose}</TableCell>
                          <TableCell>{registration.qrcode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Producten Beheren</CardTitle>
                  <CardDescription>Voeg producten toe, bewerk of verwijder ze</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Import/Export Buttons */}
                  <div className="flex gap-2">
                    <Button asChild>
                      <Label htmlFor="importUsersCSV" className="cursor-pointer">
                        <Input type="file" id="importUsersCSV" className="hidden" onChange={handleImportExcel} />
                        <Plus className="mr-2 h-4 w-4" />
                        Importeer Producten (CSV)
                      </Label>
                    </Button>
                    <Button onClick={handleExportExcel}>
                      <Plus className="mr-2 h-4 w-4" />
                      Exporteer Producten (CSV)
                    </Button>
                  </div>

                  {/* Print QR Codes */}
                  <div className="flex gap-2">
                    <Button onClick={printAllQRCodes}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Print Alle QR Codes
                    </Button>
                    <Button onClick={exportQRCodesForLabelPrinter}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Exporteer voor Labelprinter
                    </Button>
                  </div>

                  {/* Add New Product Form */}
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-2">Nieuw Product Toevoegen</h3>
                    <div className="space-y-2">
                      <Label htmlFor="newProductName">Product Naam</Label>
                      <Input
                        type="text"
                        id="newProductName"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Product naam"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newProductQrCode">QR Code</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          id="newProductQrCode"
                          value={newProductQrCode}
                          onChange={(e) => setNewProductQrCode(e.target.value)}
                          placeholder="QR Code"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQrScanMode("product-management")
                            startQrScanner()
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newProductCategory">Categorie</Label>
                      <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecteer een categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen categorie</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={addNewProduct} disabled={isLoading}>
                      {isLoading ? "Bezig met toevoegen..." : "Product Toevoegen"}
                    </Button>
                  </div>

                  {/* Product Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>QR Code</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Attachment</TableHead>
                        <TableHead>Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.qrcode}</TableCell>
                          <TableCell>{categories.find((c) => c.id === product.categoryId)?.name || "Geen"}</TableCell>
                          <TableCell>
                            {product.attachmentUrl ? (
                              <div className="flex items-center gap-2">
                                <a href={product.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  {product.attachmentName || "Bekijk bestand"}
                                </a>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleRemoveAttachment(product)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Label htmlFor={`attachment-${product.id}`} className="cursor-pointer">
                                <Input
                                  type="file"
                                  id={`attachment-${product.id}`}
                                  className="hidden"
                                  onChange={(e) => handleAttachmentUpload(product, e)}
                                />
                                Upload
                              </Label>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditProduct(product)}
                                disabled={isLoading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!product.qrcode && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => generateQRCode(product)}
                                  disabled={isLoading}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              {product.qrcode && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => printQRCode(product)}
                                  disabled={isLoading}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => removeProduct(product)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Edit Product Dialog */}
              <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Product Bewerken</DialogTitle>
                    <DialogDescription>Bewerk de details van het product.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editProductName">Product Naam</Label>
                      <Input
                        type="text"
                        id="editProductName"
                        value={editingProduct?.name || ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value } as Product)}
                        placeholder="Product naam"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editProductQrCode">QR Code</Label>
                      <Input
                        type="text"
                        id="editProductQrCode"
                        value={editingProduct?.qrcode || ""}
                        onChange={(e) => setEditingProduct({ ...editingProduct, qrcode: e.target.value } as Product)}
                        placeholder="QR Code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editProductCategory">Categorie</Label>
                      <Select
                        value={editingProduct?.categoryId || "none"}
                        onValueChange={(value) =>
                          setEditingProduct({ ...editingProduct, categoryId: value } as Product)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecteer een categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen categorie</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setShowEditProductDialog(false)}>
                      Annuleren
                    </Button>
                    <Button type="button" onClick={handleSaveProduct} disabled={isLoading}>
                      {isLoading ? "Bezig met opslaan..." : "Opslaan"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* QR Scanner Dialog */}
              <Dialog open={showQrScanner} onOpenChange={setShowQrScanner}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                    <DialogDescription>Plaats de QR code in het frame om te scannen.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center">
                    <QrScannerComponent onResult={handleQrCodeDetected} />
                    <Button type="button" variant="secondary" onClick={stopQrScanner} className="mt-4">
                      Annuleren
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Users Tab */}
            {getCurrentUserRole() === "admin" && (
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Gebruikers Beheren</CardTitle>
                    <CardDescription>Voeg gebruikers toe, bewerk of verwijder ze</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Import/Export Buttons */}
                    <div className="flex gap-2">
                      <Button asChild>
                        <Label htmlFor="importUsersCSV" className="cursor-pointer">
                          <Input type="file" id="importUsersCSV" className="hidden" onChange={handleImportUsersCSV} />
                          <Plus className="mr-2 h-4 w-4" />
                          Importeer Gebruikers (CSV)
                        </Label>
                      </Button>
                      <Button onClick={handleExportUsersCSV}>
                        <Plus className="mr-2 h-4 w-4" />
                        Exporteer Gebruikers (CSV)
                      </Button>
                      <Button onClick={downloadUserTemplate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Download Template (CSV)
                      </Button>
                    </div>

                    {/* Add New User Form */}
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-semibold mb-2">Nieuwe Gebruiker Toevoegen</h3>
                      <div className="space-y-2">
                        <Label htmlFor="newUserName">Gebruikersnaam</Label>
                        <Input
                          type="text"
                          id="newUserName"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Gebruikersnaam"
                        />
                      </div>
                      <Button onClick={addNewUser} disabled={isLoading}>
                        {isLoading ? "Bezig met toevoegen..." : "Gebruiker Toevoegen"}
                      </Button>
                    </div>

                    {/* Add New User with Auth Form */}
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-semibold mb-2">Nieuwe Gebruiker met Inlog Toevoegen</h3>
                      <div className="space-y-2">
                        <Label htmlFor="newUserNameAuth">Gebruikersnaam</Label>
                        <Input
                          type="text"
                          id="newUserNameAuth"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Gebruikersnaam"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserEmail">Email</Label>
                        <Input
                          type="email"
                          id="newUserEmail"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserPassword">Wachtwoord</Label>
                        <Input
                          type="password"
                          id="newUserPassword"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Wachtwoord"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserLevel">Niveau</Label>
                        <Select value={newUserLevel} onValueChange={setNewUserLevel}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecteer een niveau" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserBadgeCode">Badge Code</Label>
                        <Input
                          type="text"
                          id="newUserBadgeCode"
                          value={newUserBadgeCode}
                          onChange={(e) => setNewUserBadgeCode(e.target.value)}
                          placeholder="Badge Code"
                        />
                      </div>
                      <Button onClick={addNewUserWithAuth} disabled={isLoading}>
                        {isLoading ? "Bezig met toevoegen..." : "Gebruiker Toevoegen"}
                      </Button>
                    </div>

                    {/* User Table */}
                    <div className="space-y-2">
                      <Label htmlFor="userSearch">Zoek Gebruiker</Label>
                      <Input
                        type="text"
                        id="userSearch"
                        placeholder="Zoek gebruiker..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Badge Code</TableHead>
                          <TableHead>Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredAndSortedUsers().map((user) => (
                          <TableRow key={user.name}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>{user.badgeCode}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditUser(user.name)}
                                  disabled={isLoading}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeUser(user.name)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Edit User Dialog */}
                <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Gebruiker Bewerken</DialogTitle>
                      <DialogDescription>Bewerk de details van de gebruiker.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editUserName">Gebruikersnaam</Label>
                        <Input
                          type="text"
                          id="editUserName"
                          value={editingUser}
                          onChange={(e) => setEditingUser(e.target.value)}
                          placeholder="Gebruikersnaam"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editUserRole">Rol</Label>
                        <Select value={editingUserRole} onValueChange={setEditingUserRole}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecteer een rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editUserBadgeCode">Badge Code</Label>
                        <Input
                          type="text"
                          id="editUserBadgeCode"
                          value={editingUserBadgeCode}
                          onChange={(e) => setEditingUserBadgeCode(e.target.value)}
                          placeholder="Badge Code"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setShowEditUserDialog(false)}>
                        Annuleren
                      </Button>
                      <Button type="button" onClick={handleSaveUser} disabled={isLoading}>
                        {isLoading ? "Bezig met opslaan..." : "Opslaan"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            )}

            {/* Statistics Tab */}
            <TabsContent value="statistics" className="space-y-6">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    {/* Summary Cards */}
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-700">Totaal Registraties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-blue-900">{registrations.length}</div>
        <p className="text-xs text-blue-600 mt-1">Alle tijd</p>
      </CardContent>
    </Card>

    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-green-700">Actieve Gebruikers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-900">{users.length}</div>
        <p className="text-xs text-green-600 mt-1">Geregistreerd</p>
      </CardContent>
    </Card>

    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-purple-700">Producten</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-purple-900">{products.length}</div>
        <p className="text-xs text-purple-600 mt-1">In systeem</p>
      </CardContent>
    </Card>

    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-orange-700">Locaties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-orange-900">{locations.length}</div>
        <p className="text-xs text-orange-600 mt-1">Beschikbaar</p>
      </CardContent>
    </Card>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Top Users */}
    <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-rose-800 flex items-center gap-2">
          👥 Top Gebruikers
        </CardTitle>
        <CardDescription className="text-rose-600">Meest actieve gebruikers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {getTopUsers().map(([user, count], index) => (
            <div key={user} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-rose-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  index === 0 ? 'bg-rose-500' : 
                  index === 1 ? 'bg-rose-400' : 
                  index === 2 ? 'bg-rose-300' : 'bg-rose-200'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-rose-900">{user}</span>
              </div>
              <span className="font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-full text-sm">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Top Products */}
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
          📦 Top Producten
        </CardTitle>
        <CardDescription className="text-emerald-600">Meest gebruikte producten</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {getTopProducts().map(([product, count], index) => (
            <div key={product} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  index === 0 ? 'bg-emerald-500' : 
                  index === 1 ? 'bg-emerald-400' : 
                  index === 2 ? 'bg-emerald-300' : 'bg-emerald-200'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-emerald-900 text-sm">{product}</span>
              </div>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full text-sm">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Top Locations */}
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-amber-800 flex items-center gap-2">
          📍 Top Locaties
        </CardTitle>
        <CardDescription className="text-amber-600">Meest gebruikte locaties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {getTopLocations().map(([location, count], index) => (
            <div key={location} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-amber-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  index === 0 ? 'bg-amber-500' : 
                  index === 1 ? 'bg-amber-400' : 
                  index === 2 ? 'bg-amber-300' : 'bg-amber-200'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium text-amber-900">{location}</span>
              </div>
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-sm">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Product Chart */}
  <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
    <CardHeader>
      <CardTitle className="text-xl font-semibold text-indigo-800 flex items-center gap-2">
        📊 Product Registraties Overzicht
      </CardTitle>
      <CardDescription className="text-indigo-600">Verdeling van alle productregistraties</CardDescription>
    </CardHeader>
    <CardContent>
      {getProductChartData().length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart Legend */}
          <div className="space-y-3">
            <h3 className="font-semibold text-indigo-800 mb-4">Product Verdeling</h3>
            {getProductChartData().map((data, index) => (
              <div key={data.product} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-indigo-100">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: data.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-indigo-900 text-sm truncate">{data.product}</div>
                  <div className="text-xs text-indigo-600">{((data.count / registrations.length) * 100).toFixed(1)}% van totaal</div>
                </div>
                <div className="font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full text-sm">
                  {data.count}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Chart */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {getProductChartData().map((data, index) => {
                const total = getProductChartData().reduce((sum, item) => sum + item.count, 0);
                const percentage = (data.count / total) * 100;
                const angle = (percentage / 100) * 360;
                
                return (
                  <div
                    key={data.product}
                    className="absolute inset-0 rounded-full border-8 opacity-80"
                    style={{
                      borderColor: data.color,
                      transform: `rotate(${index * (360 / getProductChartData().length)}deg)`,
                      borderTopColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                    }}
                  />
                );
              })}
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-800">{registrations.length}</div>
                  <div className="text-xs text-indigo-600">Totaal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-indigo-600">Geen registraties beschikbaar voor statistieken</p>
        </div>
      )}
    </CardContent>
  </Card>

  {/* Recent Activity */}
  <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
    <CardHeader>
      <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        🕒 Recente Activiteit
      </CardTitle>
      <CardDescription className="text-slate-600">Laatste 5 registraties</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {registrations
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)
          .map((registration, index) => (
            <div key={registration.id} className="flex items-center gap-4 p-4 bg-white/60 rounded-lg border border-slate-100">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-slate-600 font-bold">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">{registration.user}</div>
                <div className="text-sm text-slate-600">{registration.product}</div>
                <div className="text-xs text-slate-500">{registration.location} • {registration.purpose}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">{registration.date}</div>
                <div className="text-xs text-slate-500">{registration.time}</div>
              </div>
            </div>
          ))}
      </div>
    </CardContent>
  </Card>
</TabsContent>

          {/* Location Management */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Locaties Beheren</CardTitle>
              <CardDescription>Voeg locaties toe, bewerk of verwijder ze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Location Form */}
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">Nieuwe Locatie Toevoegen</h3>
                <div className="space-y-2">
                  <Label htmlFor="newLocationName">Locatie Naam</Label>
                  <Input
                    type="text"
                    id="newLocationName"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Locatie naam"
                  />
                </div>
                <Button onClick={addNewLocation} disabled={isLoading}>
                  {isLoading ? "Bezig met toevoegen..." : "Locatie Toevoegen"}
                </Button>
              </div>

              {/* Location Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location}>
                      <TableCell>{location}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditLocation(location)}
                            disabled={isLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeLocation(location)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Location Dialog */}
          <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Locatie Bewerken</DialogTitle>
                <DialogDescription>Bewerk de naam van de locatie.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editLocationName">Locatie Naam</Label>
                  <Input
                    type="text"
                    id="editLocationName"
                    value={editingLocation}
                    onChange={(e) => setEditingLocation(e.target.value)}
                    placeholder="Locatie naam"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setShowEditLocationDialog(false)}>
                  Annuleren
                </Button>
                <Button type="button" onClick={handleSaveLocation} disabled={isLoading}>
                  {isLoading ? "Bezig met opslaan..." : "Opslaan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Purpose Management */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Doelen Beheren</CardTitle>
              <CardDescription>Voeg doelen toe, bewerk of verwijder ze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Purpose Form */}
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">Nieuw Doel Toevoegen</h3>
                <div className="space-y-2">
                  <Label htmlFor="newPurposeName">Doel Naam</Label>
                  <Input
                    type="text"
                    id="newPurposeName"
                    value={newPurposeName}
                    onChange={(e) => setNewPurposeName(e.target.value)}
                    placeholder="Doel naam"
                  />
                </div>
                <Button onClick={addNewPurpose} disabled={isLoading}>
                  {isLoading ? "Bezig met toevoegen..." : "Doel Toevoegen"}
                </Button>
              </div>

              {/* Purpose Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purposes.map((purpose) => (
                    <TableRow key={purpose}>
                      <TableCell>{purpose}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditPurpose(purpose)}
                            disabled={isLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removePurpose(purpose)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Purpose Dialog */}
          <Dialog open={showEditPurposeDialog} onOpenChange={setShowEditPurposeDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Doel Bewerken</DialogTitle>
                <DialogDescription>Bewerk de naam van het doel.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editPurposeName">Doel Naam</Label>
                  <Input
                    type="text"
                    id="editPurposeName"
                    value={editingPurpose}
                    onChange={(e) => setEditingPurpose(e.target.value)}
                    placeholder="Doel naam"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setShowEditPurposeDialog(false)}>
                  Annuleren
                </Button>
                <Button type="button" onClick={handleSavePurpose} disabled={isLoading}>
                  {isLoading ? "Bezig met opslaan..." : "Opslaan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Category Management */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Categorieën Beheren</CardTitle>
              <CardDescription>Voeg categorieën toe, bewerk of verwijder ze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Category Form */}
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">Nieuwe Categorie Toevoegen</h3>
                <div className="space-y-2">
                  <Label htmlFor="newCategoryName">Categorie Naam</Label>
                  <Input
                    type="text"
                    id="newCategoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Categorie naam"
                  />
                </div>
                <Button onClick={addNewCategory} disabled={isLoading}>
                  {isLoading ? "Bezig met toevoegen..." : "Categorie Toevoegen"}
                </Button>
              </div>

              {/* Category Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                            disabled={isLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeCategory(category)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Category Dialog */}
          <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Categorie Bewerken</DialogTitle>
                <DialogDescription>Bewerk de naam van de categorie.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editCategoryName">Categorie Naam</Label>
                  <Input
                    type="text"
                    id="editCategoryName"
                    value={editingCategory?.name || ""}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value } as Category)}
                    placeholder="Categorie naam"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setShowEditCategoryDialog(false)}>
                  Annuleren
                </Button>
                <Button type="button" onClick={handleSaveCategory} disabled={isLoading}>
                  {isLoading ? "Bezig met opslaan..." : "Opslaan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )\
}

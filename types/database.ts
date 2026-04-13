export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'super_admin' | 'user'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'super_admin' | 'user'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'super_admin' | 'user'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          category: 'Cash' | 'Investments' | 'Property' | 'Vehicle' | 'Gadgets' | 'Other'
          value: number
          date_added: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: 'Cash' | 'Investments' | 'Property' | 'Vehicle' | 'Gadgets' | 'Other'
          value: number
          date_added?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: 'Cash' | 'Investments' | 'Property' | 'Vehicle' | 'Gadgets' | 'Other'
          value?: number
          date_added?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      savings: {
        Row: {
          id: string
          user_id: string
          title: string
          target_amount: number
          current_amount: number
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          target_amount: number
          current_amount: number
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          target_amount?: number
          current_amount?: number
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      emergency_funds: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          category: 'Food' | 'Transportation' | 'Bills' | 'Shopping' | 'Rent' | 'Others'
          date: string
          payment_method: 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'E-Wallet' | 'Other'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          category: 'Food' | 'Transportation' | 'Bills' | 'Shopping' | 'Rent' | 'Others'
          date?: string
          payment_method?: 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'E-Wallet' | 'Other'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          category?: 'Food' | 'Transportation' | 'Bills' | 'Shopping' | 'Rent' | 'Others'
          date?: string
          payment_method?: 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'E-Wallet' | 'Other'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_on_hand: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          type: 'in' | 'out'
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          amount: number
          type: 'in' | 'out'
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          type?: 'in' | 'out'
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Asset = Database['public']['Tables']['assets']['Row']
export type Saving = Database['public']['Tables']['savings']['Row']
export type EmergencyFund = Database['public']['Tables']['emergency_funds']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type CashTransaction = Database['public']['Tables']['cash_on_hand']['Row']

export type AssetCategory = Asset['category']
export type ExpenseCategory = Expense['category']
export type PaymentMethod = Expense['payment_method']
export type UserRole = Profile['role']

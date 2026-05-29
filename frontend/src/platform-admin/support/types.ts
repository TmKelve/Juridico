export interface SupportContextItem {
  id: string
  title: string
  description: string
  owner: string
  updatedAtLabel: string
  link: string
}

export interface SupportContextApiItem {
  id?: string | number
  title?: string
  description?: string
  owner?: string
  updatedAt?: string
  link?: string
}

export interface SupportContextApiPayload {
  items?: SupportContextApiItem[]
}

"use client"

import { type Product } from "@/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"

interface ProductsTableProps {
  products: Product[]
  onDelete?: (id: string) => void
  onEdit?: (product: Product) => void
}

export function ProductsTable({ products, onDelete, onEdit }: ProductsTableProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            if (!product) return null;
            return (
              <TableRow key={product.id || Math.random()}>
              <TableCell>
                <div className="relative w-10 h-10 rounded overflow-hidden bg-muted">
                    {product.image ? (
                        <Image 
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                            No Image
                        </div>
                    )}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.assigned_code || 'No Code'}</div>
              </TableCell>
              <TableCell className="capitalize">
                {product.categoryName || "Uncategorized"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(product.price)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={product.stock <= 5 ? "destructive" : "outline"}>
                   {product.stock}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                  {product.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild className="hover:text-muted-foreground">
                    <Link href={`/product/${product.slug}`} aria-label={`Preview ${product.name}`}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </Button>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(product)}
                      aria-label={`Edit ${product.name}`}
                      className="hover:text-orange-500"
                    >
                      <Pencil className="w-4 h-4 text-orange-500" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this product?')) {
                          onDelete(product.id)
                        }
                      }}
                      aria-label={`Delete ${product.name}`}
                      className="hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

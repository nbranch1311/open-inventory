import { getUserHouseholds } from '@/actions/household'
import { getInventoryItems } from '@/actions/inventory'
import Link from 'next/link'

export default async function DashboardPage() {
  const households = await getUserHouseholds()

  if (!households || households.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>You don&apos;t have any households yet.</p>
        <Link href="/onboarding" className="text-blue-500 hover:underline">
          Create a household
        </Link>
      </div>
    )
  }

  const selectedHousehold = households[0]
  const { data: items, error } = await getInventoryItems(selectedHousehold.id)

  if (error) {
    return <div>Error loading inventory: {error}</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{selectedHousehold.name} Inventory</h1>
        <Link
          href="/dashboard/add"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500 transition-colors"
        >
          Add Item
        </Link>
      </div>

      {items && items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No items in inventory yet.</p>
          <Link
            href="/dashboard/add"
            className="text-indigo-600 hover:underline"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/${item.id}`}
              className="block p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                  <p className="text-gray-600">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                {item.expiry_date && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    new Date(item.expiry_date) < new Date() 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

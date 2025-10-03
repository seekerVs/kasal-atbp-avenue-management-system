# Project Diagrams

### Manual System Use Case Diagram

```mermaid
usecaseDiagram
    actor Customer
    actor "Shop Staff" as Staff
    actor "Shop Owner/Manager" as Manager

    rectangle "Manual Rental Process" {
        Customer -- (Inquire About Outfits)
        Customer -- (Book an Appointment)
        Customer -- (Create Reservation)
        Customer -- (Create Rental Order)
        Customer -- (Process Return)

        Staff -- (Check Item Availability)
        Staff -- (Record Appointment)
        Staff -- (Process Payment)
        Staff -- (Inspect Items)
        Staff -- (Log Damaged Item)
        
        Manager -- (Generate Sales Report)
        Manager -- (Manage Inventory)

        (Book an Appointment) ..> (Record Appointment) : <<include>>
        (Create Reservation) ..> (Check Item Availability) : <<include>>
        (Create Reservation) ..> (Process Payment) : <<include>>
        (Create Rental Order) ..> (Check Item Availability) : <<include>>
        (Create Rental Order) ..> (Process Payment) : <<include>>
        (Process Return) ..> (Inspect Items) : <<include>>
        (Process Return) <.. (Log Damaged Item) : <<extend>>
    }

    Manager --|> Staff
```
---
title: Use Case Diagram for Manual Rental System
---
left to right direction

actor Customer
actor "Shop Staff" as Staff
actor "Shop Owner/Manager" as Manager

rectangle "Manual Rental Process" {
  usecase "Inquire About Outfits" as UC1
  usecase "Book an Appointment" as UC2
  usecase "Create Reservation" as UC3
  usecase "Create Rental Order" as UC4
  usecase "Process Return" as UC5

  usecase "Check Item Availability" as UC_Check
  usecase "Record Appointment" as UC_Record
  usecase "Process Payment" as UC_Pay
  usecase "Inspect Items" as UC_Inspect
  usecase "Log Damaged Item" as UC_Damage

  usecase "Generate Sales Report" as UC_Report
  usecase "Manage Inventory" as UC_Inventory
}

' Actor Associations
Customer -- (UC1)
Customer -- (UC2)
Customer -- (UC3)
Customer -- (UC4)
Customer -- (UC5)

Staff -- (UC_Check)
Staff -- (UC_Record)
Staff -- (UC_Pay)
Staff -- (UC_Inspect)
Staff -- (UC_Damage)

Manager -- (UC_Report)
Manager -- (UC_Inventory)


' Internal Relationships
(UC2) ..> (UC_Record) : <<include>>
(UC3) ..> (UC_Check) : <<include>>
(UC3) ..> (UC_Pay) : <<include>>
(UC4) ..> (UC_Check) : <<include>>
(UC4) ..> (UC_Pay) : <<include>>
(UC5) ..> (UC_Inspect) : <<include>>
(UC_Damage) ..> (UC5) : <<extend>>


' Actor Generalization (Manager is a type of Staff)
Manager --|> Staff
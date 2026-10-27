-- Now that shipments exist, an invoice's shipment_id must point at a real shipment.
ALTER TABLE invoices
  ADD CONSTRAINT invoices_shipment_fk FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL;

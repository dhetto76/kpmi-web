-- ============================================================================
-- Seed data
--
-- Category values extracted verbatim from the live WordPress registration
-- form. Changing a name here orphans existing member records.
-- ============================================================================

insert into categories (name, slug, kind, sort_order) values
  ('Agribisnis', 'agribisnis', 'business', 0),
  ('Jasa Pariwisata', 'jasa-pariwisata', 'business', 1),
  ('Kima Petrokimia', 'kima-petrokimia', 'business', 2),
  ('Kuliner', 'kuliner', 'business', 3),
  ('Lembaga Keuangan', 'lembaga-keuangan', 'business', 4),
  ('Pertambangan', 'pertambangan', 'business', 5),
  ('Pharmacy Herbal', 'pharmacy-herbal', 'business', 6),
  ('Properti Kontraktor', 'properti-kontraktor', 'business', 7),
  ('Retail', 'retail', 'business', 8),
  ('Telekomunikasi IT', 'telekomunikasi-it', 'business', 9),
  ('Tour Travel', 'tour-travel', 'business', 10),
  ('Trading', 'trading', 'business', 11),
  ('Other', 'other', 'business', 12),
  ('Agriculture And Fresh Product', 'agriculture-and-fresh-product', 'product', 0),
  ('Automotive, Spare Parts and Accessories', 'automotive-spare-parts-and-accessories', 'product', 1),
  ('Beauty And Personal Care', 'beauty-and-personal-care', 'product', 2),
  ('Energy And Mineral', 'energy-and-mineral', 'product', 3),
  ('Fashion', 'fashion', 'product', 4),
  ('Fisheries', 'fisheries', 'product', 5),
  ('Flower and ornamental plant', 'flower-and-ornamental-plant', 'product', 6),
  ('Food and Beverages', 'food-and-beverages', 'product', 7),
  ('Handy Craft', 'handy-craft', 'product', 8),
  ('Health & Medical', 'health-dan-medical', 'product', 9),
  ('Home Appliance', 'home-appliance', 'product', 10),
  ('Jewellery And Watches', 'jewellery-and-watches', 'product', 11),
  ('Mechanicals', 'mechanicals', 'product', 12)
on conflict (kind, slug) do nothing;

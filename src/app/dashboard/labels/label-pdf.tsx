"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// Label: landscape ~10cm x 5cm
const LABEL_W = 283; // ~10cm in points
const LABEL_H = 142; // ~5cm in points
const COLS = 2;
const ROWS = 4;

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    gap: 8,
  },
  label: {
    width: LABEL_W,
    height: LABEL_H,
    border: "1.5pt solid #222",
    borderRadius: 3,
    flexDirection: "column",
    overflow: "hidden",
  },
  // --- Header row ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottom: "1pt solid #222",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
  },
  logoBox: {
    width: 36,
    height: 36,
    marginRight: 8,
    flexShrink: 0,
  },
  logoImage: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },
  institutionName: {
    flex: 1,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 1.3,
  },
  // --- Content row ---
  content: {
    flexDirection: "row",
    flex: 1,
    padding: 8,
    gap: 8,
  },
  infoSection: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 0,
  },
  fieldValue: {
    fontSize: 9,
    color: "#333",
    marginBottom: 4,
  },
  qrBox: {
    width: 88,
    height: 88,
    flexShrink: 0,
    alignSelf: "center",
  },
  qrImage: {
    width: 88,
    height: 88,
  },
});

type AssetLabel = {
  id: string;
  assetCode: string;
  name: string;
  yearPurchased: number | null;
};

type Props = {
  assets: AssetLabel[];
  qrDataUrls: Record<string, string>;
  institutionName: string;
  logoUrl?: string | null;
};

function LabelDocument({ assets, qrDataUrls, institutionName, logoUrl }: Props) {
  const pages: AssetLabel[][] = [];
  const perPage = COLS * ROWS;

  for (let i = 0; i < assets.length; i += perPage) {
    pages.push(assets.slice(i, i + perPage));
  }

  return (
    <Document>
      {pages.map((pageAssets, pi) => (
        <Page key={pi} size="A4" style={styles.page}>
          {pageAssets.map((asset) => (
            <View key={asset.id} style={styles.label}>
              {/* ── Header ── */}
              <View style={styles.header}>
                {/* Logo (optional) */}
                {logoUrl ? (
                  <View style={styles.logoBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={logoUrl} style={styles.logoImage} />
                  </View>
                ) : null}
                <Text style={styles.institutionName}>{institutionName}</Text>
              </View>

              {/* ── Content ── */}
              <View style={styles.content}>
                <View style={styles.infoSection}>
                  <Text style={styles.fieldLabel}>No. Registrasi</Text>
                  <Text style={styles.fieldValue}>{asset.assetCode}</Text>

                  <Text style={styles.fieldLabel}>Tahun Perolehan</Text>
                  <Text style={styles.fieldValue}>
                    {asset.yearPurchased ? String(asset.yearPurchased) : "-"}
                  </Text>
                </View>

                {/* QR Code */}
                {qrDataUrls[asset.id] && (
                  <View style={styles.qrBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={qrDataUrls[asset.id]} style={styles.qrImage} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

export function LabelPdfPreview(props: Props) {
  // Use a stable filename — avoid calling Date.now() during render (React purity rule)
  const fileName = `label-qr.pdf`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PDFDownloadLink
          document={<LabelDocument {...props} />}
          fileName={fileName}
        >
          {({ loading }) => (
            <Button variant="outline" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Download PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>
      <div className="h-[600px] rounded-lg border">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <LabelDocument {...props} />
        </PDFViewer>
      </div>
    </div>
  );
}

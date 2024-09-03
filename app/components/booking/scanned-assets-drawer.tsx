import { useEffect, useState } from "react";
import { AssetStatus } from "@prisma/client";
import { Form, useLoaderData } from "@remix-run/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useZorm } from "react-zorm";
import { z } from "zod";
import {
  clearFetchedScannedAssetsAtom,
  fetchedScannedAssetsAtom,
  fetchedScannedAssetsCountAtom,
  removeFetchedScannedAssetAtom,
} from "~/atoms/bookings";
import { displayQrScannerNotificationAtom } from "~/atoms/qr-scanner";
import { useViewportHeight } from "~/hooks/use-viewport-height";
import { type loader } from "~/routes/_layout+/bookings.$bookingId_.scan-assets";
import { tw } from "~/utils/tw";
import { AvailabilityLabel } from "./availability-label";
import { AssetLabel } from "../icons/library";
import { ListHeader } from "../list/list-header";
import { Button } from "../shared/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shared/drawer";
import { Table, Td, Th } from "../table";
import When from "../when/when";

type ScannedAssetsDrawerProps = {
  className?: string;
  style?: React.CSSProperties;
  isLoading?: boolean;
};

export const addScannedAssetsToBookingSchema = z.object({
  assetIds: z.array(z.string()).min(1),
});

const DRAWER_OFFSET = 390;
const TOP_GAP = 80 + 53 + 8 + 16;

export default function ScannedAssetsDrawer({
  className,
  style,
  isLoading,
}: ScannedAssetsDrawerProps) {
  const { booking } = useLoaderData<typeof loader>();

  const { vh } = useViewportHeight();

  const zo = useZorm(
    "AddScannedAssetsToBooking",
    addScannedAssetsToBookingSchema
  );

  /**
   * The values represent the size of the drawer in pixels based on its content
   * At snap point 1 we need to show 1 item
   * At snap point 2 we need to show the full list
   */
  const SNAP_POINTS = [`157px`, 1];

  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);

  const fetchedScannedAssets = useAtomValue(fetchedScannedAssetsAtom);
  const fetchedScannedAssetsCount = useAtomValue(fetchedScannedAssetsCountAtom);
  const removeFetchedScannedAsset = useSetAtom(removeFetchedScannedAssetAtom);
  const clearFetchedScannedAssets = useSetAtom(clearFetchedScannedAssetsAtom);

  useEffect(() => {
    if (fetchedScannedAssetsCount === 0) {
      setSnap(SNAP_POINTS[0]);
    }
  }, [fetchedScannedAssetsCount, setSnap, SNAP_POINTS]);

  const displayQrNotification = useSetAtom(displayQrScannerNotificationAtom);

  const someAssetsCheckedOut = fetchedScannedAssets.some(
    (asset) => asset.status === AssetStatus.CHECKED_OUT
  );
  const someAssetsInCustody = fetchedScannedAssets.some(
    (asset) => asset.status === AssetStatus.IN_CUSTODY
  );

  return (
    <div>
      <div className={tw("", className)} style={style}>
        <div className="sr-only">Add assets to booking via scan</div>

        <div className="mx-auto size-full px-4 md:max-w-4xl md:px-0">
          <div className="flex items-center justify-between border-b text-left">
            <div>{fetchedScannedAssetsCount} assets scanned</div>

            <When truthy={fetchedScannedAssetsCount > 0}>
              <DrawerDescription
                className="cursor-pointer"
                onClick={clearFetchedScannedAssets}
              >
                Clear list
              </DrawerDescription>
            </When>
          </div>

          <When truthy={fetchedScannedAssetsCount === 0}>
            <div className="my-16 flex flex-col items-center px-3 text-center">
              <div className="mb-4 rounded-full bg-primary-50  p-2">
                <div className=" rounded-full bg-primary-100 p-2 text-primary">
                  <AssetLabel className="size-6" />
                </div>
              </div>

              <div>
                <div className="text-base font-semibold text-gray-900">
                  List is empty
                </div>
                <p className="text-sm text-gray-600">
                  Fill list by scanning codes...
                </p>
              </div>
            </div>
          </When>

          <When truthy={fetchedScannedAssetsCount > 0}>
            <div className="h-[600px] overflow-auto">
              <Table className="overflow-y-auto">
                <ListHeader hideFirstColumn>
                  <Th className="p-0"> </Th>
                  <Th className="p-0"> </Th>
                </ListHeader>

                <tbody>
                  {fetchedScannedAssets.map((asset) => (
                    <Tr key={asset.id}>
                      <Td className="w-full p-0 md:p-0">
                        <div className="flex items-center justify-between gap-3 p-4 md:px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-y-1">
                              <p className="word-break whitespace-break-spaces font-medium">
                                {asset.title}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <AvailabilityLabel
                                  isAddedThroughKit={
                                    booking.assets.some(
                                      (a) => a.id === asset.id
                                    ) && !!asset.kitId
                                  }
                                  isAlreadyAdded={booking.assets.some(
                                    (a) => a.id === asset.id
                                  )}
                                  showKitStatus
                                  asset={asset}
                                  isCheckedOut={asset.status === "CHECKED_OUT"}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Button
                          className="border-none"
                          variant="ghost"
                          icon="trash"
                          onClick={() => {
                            removeFetchedScannedAsset(asset.id);
                            displayQrNotification({
                              message: "Asset was removed from list",
                            });
                          }}
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </When>

          <When truthy={fetchedScannedAssetsCount > 0}>
            <div>
              <When truthy={!!zo.errors.assetIds()?.message}>
                <p className="text-sm text-error-500">
                  {zo.errors.assetIds()?.message}
                </p>
              </When>

              <div className="flex-row px-0">
                <div asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full max-w-full"
                    disabled={isLoading}
                  >
                    Close
                  </Button>
                </div>

                <Form ref={zo.ref} className="w-full" method="POST">
                  {fetchedScannedAssets.map((asset, i) => (
                    <input
                      key={asset.id}
                      type="hidden"
                      name={`assetIds[${i}]`}
                      value={asset.id}
                    />
                  ))}

                  <Button
                    className="w-full max-w-full"
                    disabled={
                      isLoading || someAssetsCheckedOut || someAssetsInCustody
                    }
                  >
                    Confirm
                  </Button>
                </Form>
              </div>
            </div>
          </When>
        </div>
      </div>
    </div>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr
      className="hover:bg-gray-50"
      style={{
        transform: "translateZ(0)",
        willChange: "transform",
        backgroundAttachment: "initial",
      }}
    >
      {children}
    </tr>
  );
}

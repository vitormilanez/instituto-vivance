import Image from "next/image";
export function Brand() {
  return (
    <div className="brand">
      <Image src="/brand/vivance-mark.png" alt="" width={42} height={42} />
      <div>
        <strong>VIVANCE</strong>
        <small>Cuidado contínuo</small>
      </div>
    </div>
  );
}

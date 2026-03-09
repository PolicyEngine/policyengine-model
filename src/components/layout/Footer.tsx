export default function Footer() {
  return (
    <footer className="tw:bg-pe-primary-900 tw:text-white tw:py-[48px]">
      <div className="tw:max-w-[1200px] tw:mx-auto tw:px-6 tw:flex tw:justify-between tw:items-center tw:flex-wrap tw:gap-5">
        <div className="tw:flex tw:items-center tw:gap-3">
          <img
            src="https://policyengine.org/assets/logos/policyengine/white.svg"
            alt="PolicyEngine"
            className="tw:h-6"
          />
        </div>
        <p className="tw:text-sm tw:opacity-70 tw:m-0">
          PolicyEngine {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

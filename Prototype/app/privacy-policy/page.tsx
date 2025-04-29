import Link from "next/link";
import config from "@/config";



const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{" "}
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Privacy Policy for {config.appName}
        </h1>

        <div className="leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "sans-serif" }}>
          <p>Effective Date: April 24, 2024</p>
          <br />
          <p>
            <strong>1. Introduction</strong>
            <br />
            Welcome to calendrai! We are committed to protecting your privacy. This Privacy Policy outlines the types of information we collect from you, how we use it, and the steps we take to ensure your information is protected.
          </p>

          <p>Thank you for using our stuff</p>
          <p>our team eam Team</p>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;

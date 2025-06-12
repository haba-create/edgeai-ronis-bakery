// Simple test page to verify Railway deployment works
import Link from 'next/link';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Railway Deployment Test</h1>
      <p>If you can see this page, the Railway deployment is working!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>Environment Info:</h3>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'not set'}</p>
        <p><strong>PORT:</strong> {process.env.PORT || 'not set'}</p>
        <p><strong>Platform:</strong> {process.platform}</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Link href="/login" style={{ color: 'blue' }}>Go to Login Page</Link>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      timestamp: new Date().toISOString()
    }
  };
}
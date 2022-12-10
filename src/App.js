import React, { useState, useCallback, useRef, useEffect } from "react";
import styled from "styled-components";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Uploady, {
  withRequestPreSendUpdate,
  useItemFinalizeListener,
  useItemStartListener,
} from "@rpldy/uploady";
import { getMockSenderEnhancer } from "@rpldy/mock-sender";
import UploadButton from "@rpldy/upload-button";
import UploadPreview, { PREVIEW_TYPES } from "@rpldy/upload-preview";
import cropImage from "./cropImage";
import "./styles.css";
import axios from "axios";
const mockSenderEnhancer = getMockSenderEnhancer({ delay: 1500 });

const StyledReactCrop = styled(ReactCrop)`
  width: 50%;
  max-width: 500px;
  height: 200px;
`;

const PreviewImage = styled.img`
  margin: 5px;
  max-width: 200px;
  height: auto;
  max-height: 200px;
`;

const ButtonsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;

const PreviewButtons = ({
  finished,
  crop,
  updateRequest,
  onUploadCancel,
  onUploadCrop,
}) => {
  return (
    <ButtonsWrapper>
      <button
        style={{
          display: !finished && updateRequest && crop ? "block" : "none",
        }}
        onClick={onUploadCrop}
      >
        Upload Cropped
      </button>
      <button
        style={{ display: !finished && updateRequest ? "block" : "none" }}
        onClick={updateRequest}
      >
        Upload without Crop
      </button>
      <button
        style={{
          display: !finished && updateRequest && crop ? "block" : "none",
        }}
        onClick={onUploadCancel}
      >
        Cancel
      </button>
    </ButtonsWrapper>
  );
};

const UPLOAD_STATES = {
  NONE: 0,
  UPLOADING: 1,
  FINISHED: 2,
};

const ItemPreviewWithCrop = withRequestPreSendUpdate((props) => {
  const {
    id,
    url,
    isFallback,
    type,
    updateRequest,
    requestData,
    previewMethods,
  } = props;
  const cropRef = useRef(null);
  const [uploadState, setUploadState] = useState(UPLOAD_STATES.NONE);
  const [crop, setCrop] = useState(null);
  const [croppedUrl, setCroppedUrl] = useState(null);
  const isFinished = uploadState === UPLOAD_STATES.FINISHED;

  useItemStartListener(() => setUploadState(UPLOAD_STATES.UPLOADING), id);
  useItemFinalizeListener(() => setUploadState(UPLOAD_STATES.FINISHED), id);

  const onImageLoaded = useCallback((image) => {
    cropRef.current = image;
  }, []);

  const onUploadCrop = useCallback(async () => {
    if (updateRequest && (crop?.height || crop?.width)) {
      const {
        blob: croppedBlob,
        blobUrl,
        revokeUrl,
      } = await cropImage(
        cropRef.current,
        requestData.items[0].file,
        crop,
        true
      );

      requestData.items[0].file = croppedBlob;
      console.log("croppedBlob", croppedBlob);

      updateRequest({ items: requestData.items });
      setCroppedUrl({ blobUrl, revokeUrl });

      const formData = new FormData();

      formData.append("file", croppedBlob);
      formData.append("applicantId", 21);
      formData.append("docType", "aadharFront");
      formData.append("memberId", 0);
      const responseDataupload = axios.post(
        `https://ruralservice-api.nxgsolutions.in/cgruralservice/api/v1/applicant/uploadfile`,
        formData
      );
      console.log("responseDataupload =====>>", responseDataupload);
    }
  }, [requestData, updateRequest, crop]);

  const onUploadCancel = useCallback(() => {
    updateRequest(false);
    if (previewMethods.current?.clear) {
      previewMethods.current.clear();
    }
  }, [updateRequest, previewMethods]);

  useEffect(() => () => croppedUrl?.revokeUrl(), [croppedUrl]);

  return isFallback || type !== PREVIEW_TYPES.IMAGE ? (
    <PreviewImage src={url} alt="fallback img" />
  ) : (
    <>
      {requestData && uploadState === UPLOAD_STATES.NONE ? (
        <StyledReactCrop
          ruleOfThirds
          src={url}
          crop={crop}
          onImageLoaded={onImageLoaded}
          onChange={setCrop}
          onComplete={setCrop}
          style={{ height: "100%" }}
        />
      ) : (
        <PreviewImage src={croppedUrl?.blobUrl || url} alt="img to upload" />
      )}
      <PreviewButtons
        finished={isFinished}
        crop={crop}
        updateRequest={updateRequest}
        onUploadCancel={onUploadCancel}
        onUploadCrop={onUploadCrop}
      />
      <p>{isFinished ? "FINISHED" : ""}</p>
    </>
  );
});

export default function App() {
  const previewMethodsRef = useRef();

  return (
    <Uploady
      multiple={false}
      destination={{ url: "[upload-url]" }}
      enhancer={mockSenderEnhancer}
    >
      <div className="App">
       
        <UploadButton>Select File to upload</UploadButton>
        <br />
        <UploadPreview
          PreviewComponent={ItemPreviewWithCrop}
          previewComponentProps={{ previewMethods: previewMethodsRef }}
          previewMethodsRef={previewMethodsRef}
          fallbackUrl="https://icon-library.net/images/image-placeholder-icon/image-placeholder-icon-6.jpg"
        />
      </div>
    </Uploady>
  );
}
